// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
import bre from "@nomiclabs/buidler";

describe("Gelato-Kyber Demo Part 1: All in one Tx: Create proxy, do setup and submit Task", function () {
  // No timeout for Mocha due to Rinkeby mining latency
  this.timeout(0);

  // We use our User Wallet. Per our config this wallet is at the accounts index 0
  // and hence will be used by default for all transactions we send.
  let myUserAddress;

  // We also want to keep track of our Provider
  let myUserProxyAddress;

  // the current gas price in the gelato system
  let currentGelatoGasPrice;

  // --> Step 1: Deploy your GelatoUserProxy constants & vars
  // We will send the Step2 Transaction from our UserWallet to GelatoUserProxyFactory
  // 1) We use the already deployed instance of GelatoUserProxyFactory
  const gelatoUserProxyFactorAddress =
    bre.network.config.deployments.GelatoUserProxyFactory;
  let gelatoUserProxyFactory;

  // 2) We will deploy a GelatoUserProxy using the Factory, or if we already deployed
  //  one, we will use that one.
  let proxyIsDeployedAlready;
  let myUserProxy;
  const CREATE_2_SALT = 42069; // for create2 and address prediction

  const estimatedGasPerExecution = ethers.utils.bigNumberify("500000");

  // --> Step 2: Submit your Task to Gelato via your GelatoUserProxy constants & vars
  // 1) We use the already deployed instance of ConditionTimeStateful
  const conditionTimeStatefulAddress =
    bre.network.config.deployments.ConditionTimeStateful;
  let conditionTimeStateful; // contract instance
  let conditionEvery2minutes; // gelato Condition obj

  const KNC = bre.network.config.addressBook.erc20.KNC;
  const KNC_AMOUNT_PER_TRADE = utils.parseUnits("1", 18);

  // 3) We use the already deployed instance of ActionKyberTrade
  const actionKyberTradeAddress =
    bre.network.config.deployments.ActionKyberTrade;
  let actionKyberTrade; // contract instance
  let actionTradeDaiOnKyber; // gelato Action obj
  const ETH = bre.network.config.addressBook.kyber.ETH;

  // 4) The last Action updates the ConditionTimeStateful with the time of the last trade
  let actionUpdateConditionTime; // gelato Action obj
  const TWO_MINUTES = 120; // seconds

  // All these variables and constants will be used to create our Gelato Task object:
  let taskAutomateKyberTradeWithFee;

  // --> Step 2: Submit your Task to Gelato via your GelatoUserProxy
  before(async function () {
    // We get our User Wallet from the Buidler Runtime Env
    const myUserWallet = await bre.getUserWallet();
    myUserAddress = await myUserWallet.getAddress();

    // --> Step 1: Deploy your GelatoUserProxy
    gelatoUserProxyFactory = await ethers.getContractAt(
      "IGelatoUserProxyFactory",
      gelatoUserProxyFactorAddress
    );

    currentGelatoGasPrice = await bre.run("fetchGelatoGasPrice");

    // 2) We will later deploy a GelatoUserProxy alongside Task submission,
    //  using the Factory's create2 method, which allows us to already predict
    //  the myUserProxyAddress now, by using the same SALT for create2 later.
    //  However, we first check if we already deployed a proxy before.
    myUserProxyAddress = await gelatoUserProxyFactory.predictProxyAddress(
      myUserAddress,
      CREATE_2_SALT
    );
    proxyIsDeployedAlready = await gelatoUserProxyFactory.isGelatoProxyUser(
      myUserAddress,
      myUserProxyAddress
    );
    if (proxyIsDeployedAlready) {
      [myUserProxyAddress] = await gelatoUserProxyFactory.gelatoProxiesByUser(
        myUserAddress
      );
      myUserProxy = await ethers.getContractAt(
        "GelatoUserProxy",
        myUserProxyAddress
      );
    }
    // --> Step 2: Submit your Task to Gelato via your GelatoUserProxy
    // For this we create a specific Gelato object called a Task
    // The Task consists of a a special GelatoCondition and GelatoAction object.

    // 1) Instantiate the Condition obj of the Task
    //  a) We instantiate ConditionTimeStateful contract to get the Data for the condition
    conditionTimeStateful = await ethers.getContractAt(
      "ConditionTimeStateful",
      conditionTimeStatefulAddress
    );
    //  b) We instantiate the condition obj
    conditionEvery2minutes = new Condition({
      inst: conditionTimeStatefulAddress,
      data: await conditionTimeStateful.getConditionData(myUserProxyAddress),
    });

    // 2) We instantiate the Actions objects that belong to the Task

    //  2.1a) We instantiate ActionKyberTrade contract to get the Data for the Action
    actionKyberTrade = await ethers.getContractAt(
      "ActionKyberTrade",
      actionKyberTradeAddress
    );
    //  2.1b) We instantiate the ActionKyberTrade obj
    actionTradeDaiOnKyber = new Action({
      addr: actionKyberTradeAddress,
      data: await actionKyberTrade.getActionData(
        myUserAddress, // origin
        KNC, // sendToken
        KNC_AMOUNT_PER_TRADE, // sendAmount (1 KNC)
        ETH, // receiveToken
        myUserAddress // receiver
      ),
      operation: Operation.Delegatecall, // This Action must be executed via the UserProxy
      dataFlow: DataFlow.None, // Only relevant if an previous action wants to pass data into this action
      termsOkCheck: true, // Some sanity checks have to pass before Execution is granted
    });

    //  2.2a) We instantiate the Action obj that updates the ConditionTimeStateful
    //   with the time of the last automated trade.
    actionUpdateConditionTime = new Action({
      addr: conditionTimeStatefulAddress,
      data: await bre.run("abi-encode-withselector", {
        contractname: "ConditionTimeStateful",
        functionname: "setRefTime",
        inputs: [TWO_MINUTES /* _timeDelta */, 0],
      }),
      operation: Operation.Call, // This Action must be called from the UserProxy
    });

    // This is all the info we need for the Task whitelisting
    taskAutomateKyberTradeWithFee = new Task({
      // All the conditions have to be met
      conditions: [conditionEvery2minutes],
      // These Actions have to be executed in the same TX all-or-nothing
      actions: [actionTradeDaiOnKyber, actionUpdateConditionTime],
    });
  });

  // --> Step 2: Submit your Task to Gelato via your GelatoUserProxy
  it("Deployed UserProxy, conducted setup and submitted my Task Cycle", async function () {
    // First we want to make sure that the Task we want to submit actually has
    // a valid Provider, so we need to ask GelatoCore some questions about the Provider.

    // Instantiate GelatoCore contract instance for sanity checks
    const gelatoCore = await ethers.getContractAt(
      "GelatoCore", // fetches the contract ABI from artifacts/
      network.config.deployments.GelatoCore // the Rinkeby Address of the deployed GelatoCore
    );

    // For our Task to be executable, our Provider must have sufficient funds on Gelato
    const providerIsLiquid = await gelatoCore.isProviderLiquid(
      myUserProxyAddress,
      estimatedGasPerExecution.mul(ethers.utils.bigNumberify("3")), // we need roughtly estimatedGasPerExecution * 3 executions as balance on gelato
      currentGelatoGasPrice // gelatoGasPrice demo value
    );
    if (!providerIsLiquid) {
      console.log(
        "\n ❌  Ooops! Your Provider needs to provide more funds to Gelato \n"
      );
      console.log("DEMO: run this command: `yarn provide` first");
      process.exit(1);
    }

    // For the Demo, make sure the Provider has the Gelato default Executor assigned
    const assignedExecutor = await gelatoCore.executorByProvider(
      myUserProxyAddress
    );
    if (
      assignedExecutor !== network.config.addressBook.gelatoExecutor.default
    ) {
      console.log(
        "\n ❌  Ooops! Your Provider needs to assign the gelato default Executor \n"
      );
      console.log("DEMO: run this command: `yarn provide` first");
      process.exit(1);
    }

    // For the Demo, our Provider must use the deployed ProviderModuleGelatoUserProxy
    const userProxyModuleIsProvided = await gelatoCore.isModuleProvided(
      myUserProxyAddress,
      network.config.deployments.ProviderModuleGelatoUserProxy
    );
    if (!userProxyModuleIsProvided) {
      console.log(
        "\n ❌  Ooops! Your Provider still needs to add ProviderModuleGelatoUserProxy \n"
      );
      console.log("DEMO: run this command: `yarn provide` first");
      process.exit(1);
    }

    // The single Transaction that deploys your GelatoUserProxy and submits your Task Cycle
    if (
      providerIsLiquid &&
      assignedExecutor === network.config.addressBook.gelatoExecutor.default &&
      userProxyModuleIsProvided
    ) {
      // We also want to keep track of token balances in our UserWallet
      const myUserWalletDAIBalance = await bre.run("erc20-balance", {
        erc20name: "KNC",
        owner: myUserAddress,
      });

      // Since our Proxy will move a total of 3 KNC from our UserWallet to
      // trade them for ETH and pay the Provider fee, we need to make sure the we
      // have the KNC balance
      if (!myUserWalletDAIBalance.gte(3)) {
        console.log(
          "\n ❌ Ooops! You need at least 3 KNC in your UserWallet \n"
        );
        process.exit(1);
      }

      // We also monitor the KNC approval our GelatoUserProxy has from us
      const myUserProxyDAIAllowance = await bre.run("erc20-allowance", {
        owner: myUserAddress,
        erc20name: "KNC",
        spender: myUserProxyAddress,
      });

      // Since our Proxy will move a total of 3 KNC from our UserWallet to
      // trade them for ETH and pay the Provider fee, we need to make sure the we
      // that we have approved our UserProxy. We can already approve it before
      // we have even deployed it, due to create2 address prediction magic.
      if (!myUserProxyDAIAllowance.gte(utils.parseUnits("3", 18))) {
        try {
          console.log("\n Sending Transaction to approve UserProxy for KNC.");
          console.log("\n Waiting for KNC Approval Tx to be mined....");
          await bre.run("erc20-approve", {
            erc20name: "KNC",
            amount: utils.parseUnits("3", 18).toString(),
            spender: myUserProxyAddress,
          });
          console.log(
            "\n Gelato User Proxy now has your Approval to move 3 KNC  ✅ \n"
          );
        } catch (error) {
          console.error("\n UserProxy KNC Approval failed ❌  \n", error);
          process.exit(1);
        }
      } else {
        console.log(
          "\n Gelato User Proxy already has your Approval to move 3 KNC  ✅ \n"
        );
      }

      // To submit Tasks to  Gelato we need to instantiate a GelatoProvider object
      const myGelatoProvider = new GelatoProvider({
        addr: myUserProxyAddress,
        module: network.config.deployments.ProviderModuleGelatoUserProxy,
      });

      // We should also specify an expiryDate for our Task Cycle
      // Since we want to trade 3 times every 2 minutes, something like 15 minutes from
      //  now should be reasonably safe in case of higher network latency.
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const expiryDate = nowInSeconds + 900; // 15 minutes from now

      if (proxyIsDeployedAlready) {
        // If we already have a GelatoUserProxy from previous usage, we submit our
        // TaskCycle of our 3 consecutive Tasks to GelatoCore via our proxy directly.
        let taskCycleSubmissionTx;
        try {
          console.log("\n Sending Transaction to submit Task Cycle!");
          taskCycleSubmissionTx = await myUserProxy.execActionsAndSubmitTaskCycle(
            [actionUpdateConditionTime], // we need to setup the Time Condition
            myGelatoProvider,
            [taskAutomateKyberTradeWithFee], // we only have one type of Task
            expiryDate, // auto-cancel if not completed in 15 minutes from now
            3, // the num of times we want our Task to be executed: 3 times every 2 minutes
            {
              gasLimit: 1000000,
              gasPrice: utils.parseUnits("10", "gwei"),
            }
          );
        } catch (error) {
          console.error("\n PRE taskCycleSubmissionTx error ❌  \n", error);
          process.exit(1);
        }
        try {
          console.log("\n Waiting for taskCycleSubmissionTx to get mined...");
          await taskCycleSubmissionTx.wait();
          console.log("\n Task Cycle Submitted ✅ \n");
        } catch (error) {
          console.error("\n POST taskCycleSubmissionTx error ❌ ", error);
          process.exit(1);
        }
      } else {
        // If we have not deployed our GelatoUserProxy yet, we deploy it and submit our
        // TaskCycle via the GelatoUserProxyFactory
        let proxyDeploymentAndTaskCycleSubmissionTx;
        try {
          console.log(
            "\n Sending Transaction to Create Proxy, setup proxy and submit Task!"
          );
          proxyDeploymentAndTaskCycleSubmissionTx = await gelatoUserProxyFactory.createTwoExecActionsSubmitTaskCycle(
            CREATE_2_SALT,
            [actionUpdateConditionTime], // we need to setup the Time Condition
            myGelatoProvider,
            [taskAutomateKyberTradeWithFee], // we only have one type of Task
            expiryDate, // auto-cancel if not completed in 15 minutes from now
            3, // the num of times we want our Task to be executed: 3 times every 2 minutes
            {
              gasLimit: 4000000,
              gasPrice: utils.parseUnits("10", "gwei"),
            }
          );
        } catch (error) {
          console.error(
            "\n PRE Create Proxy, setup proxy and submit Task Tx error ❌  \n",
            error
          );
          process.exit(1);
        }
        try {
          console.log(
            "\n Waiting for Create Proxy, setup proxy and submit Task Tx to get mined..."
          );
          await proxyDeploymentAndTaskCycleSubmissionTx.wait();
          console.log(
            "\n Create Proxy, setup proxy and submit Task Tx submitted ✅ \n"
          );
        } catch (error) {
          console.error(
            "\n POST Create Proxy, setup proxy and submit Task Tx error ❌ ",
            error
          );
          process.exit(1);
        }
      }
    } else {
      console.log("\n ❌ Ooops! Run `yarn provide` first \n");
    }
  });
});

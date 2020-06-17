// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
import bre from "@nomiclabs/buidler";

describe("Gelato-Kyber Demo Part 2: Step 2 => submit Task Chain via UserProxy", function () {
  // No timeout for Mocha due to Rinkeby mining latency
  this.timeout(0);

  // We use our User Wallet. Per our config this wallet is at the accounts index 0
  // and hence will be used by default for all transactions we send.
  let myUserWallet;
  let myUserAddress;

  // We also want to keep track of our Provider
  let myProviderAddress;

  // --> Step 1: Deploy your GelatoUserProxy constants & vars
  // We will send the Step2 Transaction from our UserWallet to GelatoUserProxyFactory
  // 1) We use the already deployed instance of GelatoUserProxyFactory
  const gelatoUserProxyFactorAddress =
    bre.network.config.deployments.GelatoUserProxyFactory;
  let gelatoUserProxyFactory;

  // 2) We will deploy a GelatoUserProxy using the Factory, or if we already deployed
  //  one, we will use that one.
  let proxyIsDeployedAlready;
  let myUserProxyAddress;
  let myUserProxy;
  const CREATE_2_SALT = 42069; // for create2 and address prediction

  // --> Step 2: Submit your Task to Gelato via your GelatoUserProxy constants & vars
  // 1) We use the already deployed instance of ConditionTimeStateful
  const conditionTimeStatefulAddress =
    bre.network.config.deployments.ConditionTimeStateful;
  let conditionTimeStateful; // contract instance
  let conditionEvery2minutes; // gelato Condition obj

  // 2) We use the already deployed instance of ActionFeeHandler
  const actionFeeHandlerAddress =
    bre.network.config.deployments.ActionFeeHandler;
  let actionFeeHandler; // contract instance
  let actionPayProvider10percentOfDai; // gelato Action obj
  const DAI = bre.network.config.addressBook.erc20.DAI;
  const DAI_AMOUNT_PER_TRADE = utils.parseUnits("10", 18);

  // 3) We use the already deployed instance of ActionKyberTrade
  const actionKyberTradeAddress =
    bre.network.config.deployments.ActionKyberTrade;
  let actionKyberTrade; // contract instance
  let actionTrade10DaiForKNC; // gelato Action obj
  const KNC = bre.network.config.addressBook.erc20.KNC;

  // 4) The last Action updates the ConditionTimeStateful with the time of the last trade
  let actionUpdateConditionTime; // gelato Action obj
  const TWO_MINUTES = 120; // seconds

  // All these variables and constants will be used to create our Gelato Task object:
  let taskAutomateKyberTradeWithFee;

  // We also want to keep track of token balances in our UserWallet
  let myUserWalletETHBalance;
  let myUserWalletDAIBalance;
  let myUserWalletKNCBalance;

  // We also monitor the DAI approval our GelatoUserProxy has from us
  let myUserProxyDAIAllowance;

  // We also want to track the Provider DAI Balance to check for Provider Fees
  let myProvidersDAIBalance;

  // --> Step 2: Submit your Task to Gelato via your GelatoUserProxy
  before(async function () {
    // We get our User Wallet from the Buidler Runtime Env
    myUserWallet = await bre.getUserWallet();
    myUserAddress = await myUserWallet.getAddress();

    // --> Step 1: Deploy your GelatoUserProxy
    gelatoUserProxyFactory = await ethers.getContractAt(
      "IGelatoUserProxyFactory",
      gelatoUserProxyFactorAddress
    );

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
    //  2.1a) We instantiate ActionFeeHandler contract to get the Data for the Action
    actionFeeHandler = await ethers.getContractAt(
      "ActionFeeHandler",
      actionFeeHandlerAddress
    );
    //  2.1b) We instantiate the ActionFeeHandler obj
    actionPayProvider10percentOfDai = new Action({
      addr: actionFeeHandlerAddress,
      data: await actionFeeHandler.getActionData(
        DAI, // sendToken
        DAI_AMOUNT_PER_TRADE, // sendAmount (10 DAI)
        myUserAddress // feePayer
      ),
      operation: Operation.Delegatecall, // This Action must be executed via the UserProxy
      dataFlow: DataFlow.Out, // Tell ActionKyberTrade how much DAI to sell after fee
      termsOkCheck: true, // Some sanity checks have to pass before Execution is granted
    });

    //  2.2a) We instantiate ActionKyberTrade contract to get the Data for the Action
    actionKyberTrade = await ethers.getContractAt(
      "ActionKyberTrade",
      actionKyberTradeAddress
    );
    //  2.2b) We instantiate the ActionKyberTrade obj
    actionTrade10DaiForKNC = new Action({
      addr: actionKyberTradeAddress,
      data: await actionKyberTrade.getActionData(
        myUserAddress, // origin
        DAI, // sendToken
        DAI_AMOUNT_PER_TRADE, // sendAmount (10 DAI)
        KNC, // receiveToken
        myUserAddress // receiver
      ),
      operation: Operation.Delegatecall, // This Action must be executed via the UserProxy
      dataFlow: DataFlow.In, // Expects DAI sell amount after fee from actionFeeHandler
      termsOkCheck: true, // Some sanity checks have to pass before Execution is granted
    });

    //  2.3a) We instantiate the Action obj that updates the ConditionTimeStateful
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
      actions: [
        actionPayProvider10percentOfDai,
        actionTrade10DaiForKNC,
        actionUpdateConditionTime,
      ],
    });

    // We also want to keep track of token balances in our UserWallet
    myUserWalletETHBalance = await myUserWallet.getBalance();
    myUserWalletDAIBalance = await bre.run("erc20-balance", {
      erc20name: "DAI",
      owner: myUserAddress,
    });
    myUserWalletKNCBalance = await bre.run("erc20-balance", {
      erc20name: "KNC",
      owner: myUserAddress,
    });

    // We also monitor the DAI approval our GelatoUserProxy has from us
    myUserProxyDAIAllowance = await bre.run("erc20-allowance", {
      owner: myUserAddress,
      erc20name: "DAI",
      spender: myUserProxyAddress,
    });

    // We also want to track the Provider DAI Balance to check for Provider Fees
    // We get our Provider Wallet from the Buidler Runtime Env
    const myProviderWallet = await bre.getProviderWallet();
    myProviderAddress = await myProviderWallet.getAddress();
    myProvidersDAIBalance = await bre.run("erc20-balance", {
      owner: myProviderAddress,
      erc20name: "DAI",
    });

    // Print this balance information to the screen
    logBalances({
      myUserWalletETHBalance,
      myUserWalletDAIBalance,
      myUserWalletKNCBalance,
      myUserProxyDAIAllowance,
      myProvidersDAIBalance,
    });
  });

  // --> Step 2: Submit your Task to Gelato via your GelatoUserProxy
  it("I, as the Gelato User, deployed my UserProxy and submitted my Task Cycle", async function () {
    // First we want to make sure that the Task we want to submit actually has
    // a valid Provider, so we need to ask GelatoCore some questions about the Provider.

    // Instantiate GelatoCore contract instance for sanity checks
    const gelatoCore = await ethers.getContractAt(
      "IGelatoProviders", // fetches the contract ABI from artifacts/
      network.config.deployments.GelatoCore // the Rinkeby Address of the deployed GelatoCore
    );

    // For our Task to be executable, our Provider must have sufficient funds on Gelato
    const providerIsLiquid = await gelatoCore.isProviderLiquid(
      myProviderAddress,
      6000000, // gelatoMaxGas demo value
      utils.parseUnits("50", "gwei") // gelatoGasPrice demo value
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
      myProviderAddress
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

    // For our Task to be executable, our Provider must have whitelisted its TaskSpec
    const taskSpec = new TaskSpec({
      // All the conditions have to be met
      conditions: [conditionTimeStatefulAddress],
      // These Actions have to be executed in the same TX all-or-nothing
      actions: [
        actionPayProvider10percentOfDai,
        actionTrade10DaiForKNC,
        actionUpdateConditionTime,
      ],
      gasPriceCeil: 0, // placeHolder for gasPriceCeil
    });
    const isTaskSpecProvided = await gelatoCore.isTaskSpecProvided(
      myProviderAddress,
      taskSpec
    );
    if (isTaskSpecProvided === "TaskSpecNotProvided") {
      console.log(
        "\n ❌  Ooops! Your Provider still needs to provide the TaskSpec for your Task \n"
      );
      console.log("DEMO: run this command: `yarn provide` first");
      process.exit(1);
    }

    // For the Demo, our Provider must use the deployed ProviderModuleGelatoUserProxy
    const userProxyModuleIsProvided = await gelatoCore.isModuleProvided(
      myProviderAddress,
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
      isTaskSpecProvided === "OK" &&
      userProxyModuleIsProvided
    ) {
      // Since our Proxy will move a total of 30 DAI from our UserWallet to
      // trade them for KNC and pay the Provider fee, we need to make sure the we
      // have the DAI balance
      if (!myUserWalletDAIBalance.gte(30)) {
        console.log(
          "\n ❌ Ooops! You need at least 30 DAI in your UserWallet \n"
        );
        process.exit(1);
      }

      // Since our Proxy will move a total of 30 DAI from our UserWallet to
      // trade them for KNC and pay the Provider fee, we need to make sure the we
      // that we have approved our UserProxy. We can already approve it before
      // we have even deployed it, due to create2 address prediction magic.
      if (!myUserProxyDAIAllowance.gte(utils.parseUnits("30", 18))) {
        try {
          console.log("\n Sending Transaction to approve UserProxy for DAI.");
          console.log("Waiting for DAI Approval Tx to be mined....");
          await bre.run("erc20-approve", {
            erc20name: "DAI",
            amount: utils.parseUnits("30", 18).toString(),
            spender: myUserProxyAddress,
          });
          console.log(
            "Gelato User Proxy now has your Approval to move 30 DAI  ✅ \n"
          );
        } catch (error) {
          console.error("\n UserProxy DAI Approval failed ❌  \n", error);
          process.exit(1);
        }
      } else {
        console.log(
          "Gelato User Proxy already has your Approval to move 30 DAI  ✅ \n"
        );
      }

      // To submit Tasks to  Gelato we need to instantiate a GelatoProvider object
      const myGelatoProvider = new GelatoProvider({
        addr: myProviderAddress,
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
              gasLimit: 4000000,
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
          console.log("Task Cycle Submitted ✅ \n");
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
            "\n Sending Transaction to deploy GelatoUserProxy and submit Task Cycle!"
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
            "\n PRE proxyDeploymentAndTaskCycleSubmissionTx error ❌  \n",
            error
          );
          process.exit(1);
        }
        try {
          console.log(
            "\n Waiting for proxyDeploymentAndTaskCycleSubmissionTx to get mined..."
          );
          await proxyDeploymentAndTaskCycleSubmissionTx.wait();
          console.log("UserProxy deployed and Task Cycle submitted ✅ \n");
        } catch (error) {
          console.error(
            "\n POST proxyDeploymentAndTaskCycleSubmissionTx error ❌ ",
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

function logBalances({
  myUserWalletETHBalance,
  myUserWalletDAIBalance,
  myUserWalletKNCBalance,
  myUserProxyDAIAllowance,
  myProvidersDAIBalance,
}) {
  const formatMyUserWalletETHBalance = utils
    .formatEther(myUserWalletETHBalance)
    .toString();
  const formatMyUserWalletDAIBalance = utils
    .formatEther(myUserWalletDAIBalance)
    .toString();
  const formatMyUserWalletKNCBalance = utils
    .formatEther(myUserWalletKNCBalance)
    .toString();
  const formatMyUserProxyDAIAllowance = utils
    .formatEther(myUserProxyDAIAllowance)
    .toString();
  const formatMyProvidersDAIBalance = utils
    .formatEther(myProvidersDAIBalance)
    .toString();

  console.log(
    `\n ___💰 Current Token BALANCES ____💰
     \n myUserWallet ETH Balance: ${formatMyUserWalletETHBalance} ETH\n
     \n myUserWalletDAIBalance:   ${formatMyUserWalletDAIBalance} DAI\n
     \n myUserWalletKNCBalance:   ${formatMyUserWalletKNCBalance} KNC\n
     \n myUserProxyDAIAllowance:  ${formatMyUserProxyDAIAllowance} DAI\n
     \n myProvidersDAIBalance:    ${formatMyProvidersDAIBalance} DAI\n`
  );
}


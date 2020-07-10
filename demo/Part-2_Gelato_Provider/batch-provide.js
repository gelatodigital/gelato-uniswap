// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
import bre from "@nomiclabs/buidler";

describe("Gelato-Kyber Demo Part 2: Batch Provide", function () {
  // No timeout for Mocha due to Rinkeby mining latency
  this.timeout(0);

  // We use our Provider Wallet
  let myProviderAddress;
  let myProviderWallet;

  // We will send a Transaction to GelatoCore on Rinkeby
  const gelatoCoreAddress = bre.network.config.deployments.GelatoCore;
  let gelatoCore;

  // --> Step 1: Conditions and Actions
  // 1) We use the already deployed instance of ConditionTimeStateful
  const conditionTimeStatefulAddress =
    bre.network.config.deployments.ConditionTimeStateful;
  // 2) We use the already deployed instance of ActionFeeHandler
  const actionFeeHandlerAddress =
    bre.network.config.deployments.ActionFeeHandler;
  // 3) We use the already deployed instance of ActionKyberTrade
  const actionKyberTradeAddress =
    bre.network.config.deployments.ActionKyberTrade;

  // --> Step 2: Assign your Executor
  // We use Gelato's default Rinkeby Executor
  const executorAddress = bre.network.config.addressBook.gelatoExecutor.default;

  // --> Step 3: Provide Funds
  // We provide 2 ETH to Gelato, so that many Task executions can happen
  const fundsToProvide = utils.parseEther("2");

  // --> Step 4: Whitelist Tasks
  // For this we create a specific Gelato object called a TaskSpec
  // The TaskSpec only needs the address of the Condition, but we need to provide
  /// more information about the Actions:

  // Action that automatically trades for our Users on Kyber
  const kyberAction = new Action({
    addr: actionKyberTradeAddress, // The address of the contract with the Action logic
    data: constants.HashZero, // The exact Action payload is ignored for whitelisting
    operation: Operation.Delegatecall, // This Action must be executed via the UserProxy
    dataFlow: DataFlow.None, // No data is inputted before this action by another one
    termsOkCheck: true, // Some sanity checks have to pass before Execution is granted
  });
  // We also need to chain a third Action that updates ConditionTimeStateful
  const updateConditionTimeAction = new Action({
    addr: conditionTimeStatefulAddress,
    data: constants.HashZero, // The exact Action payload is ignored for whitelisting
    operation: Operation.Call, // This Action must be executed via the UserProxy
  });

  // We also need to specify up to which gasPrice the Action should be executable
  const gasPriceCeil = utils.parseUnits("50", "gwei");

  // This is all the info we need for the TaskSpec whitelisting
  const gelatoKyberTaskSpec = new TaskSpec({
    // All the conditions have to be met
    conditions: [conditionTimeStatefulAddress],
    // These Actions have to be executed in the same TX all-or-nothing
    actions: [kyberAction, updateConditionTimeAction],
    gasPriceCeil,
  });

  // --> Step 5: Select a ProviderModule
  // For the demo we use the already deployed GelatoUserProxy ProviderModule
  // as Gelato automation requires our Users to have Smart Contract Proxies.
  // However, outside of the demo you should always make sure you deploy your own
  // ProviderModule, or at least use one that has immutable trust.
  const providerModuleGelatoUserProxyAddress =
    bre.network.config.deployments.ProviderModuleGelatoUserProxy;

  // --> Step 6: Complete Steps 2-5 in one Transaction
  before(async function () {
    // We get our Provider Wallet from the Buidler Runtime Env
    myProviderWallet = await bre.getProviderWallet();
    myProviderAddress = await myProviderWallet.getAddress();

    // Instantiate GelatoCore contract instance connected to our ProviderWallet
    gelatoCore = await ethers.getContractAt(
      "IGelatoProviders", // fetches the contract ABI from artifacts/
      gelatoCoreAddress, // the Rinkeby Address of the deployed GelatoCore
      myProviderWallet // We send a tx to the contract from our Provider Wallet
    );
  });

  // Complete Steps 2-5 in one Transaction
  it("I, as the Gelato Provider, successfully completed demo Steps 1-4", async function () {
    // First we need to make sure that we have not already completed any of
    // Steps 2-5 before, lest we get a reverting transaction
    const currentProviderFunds = await gelatoCore.providerFunds(
      myProviderAddress
    );
    const assignedExecutor = await gelatoCore.executorByProvider(
      myProviderAddress
    );
    const noExecutorAssigned =
      assignedExecutor === constants.AddressZero ? true : false;
    // Make sure executorAddress is minStaked
    if (noExecutorAssigned)
      expect(await gelatoCore.isExecutorMinStaked(executorAddress)).to.be.true;
    const taskSpecIsNotProvided =
      (await gelatoCore.isTaskSpecProvided(
        myProviderAddress,
        gelatoKyberTaskSpec
      )) === "TaskSpecNotProvided"
        ? true
        : false;
    const moduleIsProvided = await gelatoCore.isModuleProvided(
      myProviderAddress,
      providerModuleGelatoUserProxyAddress
    );

    // The single Transaction that completes Steps 2-5: gelatoCore.multiProvide()
    if (noExecutorAssigned || taskSpecIsNotProvided || !moduleIsProvided) {
      let multiProvideTx;
      try {
        multiProvideTx = await gelatoCore.multiProvide(
          noExecutorAssigned ? executorAddress : constants.AddressZero,
          taskSpecIsNotProvided ? [gelatoKyberTaskSpec] : [],
          !moduleIsProvided ? [providerModuleGelatoUserProxyAddress] : [],
          {
            value: currentProviderFunds.lt(fundsToProvide)
              ? fundsToProvide
              : constants.Zero,
            gasLimit: 6000000,
            gasPrice: utils.parseUnits("10", "gwei"),
          }
        );
      } catch (error) {
        console.error("\n PRE provide TX error ❌  \n", error);
        process.exit(1);
      }
      try {
        console.log("\n Waiting for provide TX to get mined...");
        await multiProvideTx.wait();
        console.log("Provide TX successfully mined ✅\n");
      } catch (error) {
        console.error("\n Provide TX error ❌ ", error);
        process.exit(1);
      }
    } else {
      console.log(
        "\n Executor assigned and Funds, TaskSpec and Module already provided ✅ \n"
      );
    }

    // Now we check that Steps 2-5 were completed successfully
    expect(await gelatoCore.providerFunds(myProviderAddress)).to.be.gte(
      fundsToProvide
    );
    expect(await gelatoCore.executorByProvider(myProviderAddress)).to.be.equal(
      executorAddress
    );
    expect(
      await gelatoCore.isTaskSpecProvided(
        myProviderAddress,
        gelatoKyberTaskSpec
      )
    ).to.be.equal("OK");
    expect(
      await gelatoCore.isModuleProvided(
        myProviderAddress,
        providerModuleGelatoUserProxyAddress
      )
    ).to.be.true;
  });
});

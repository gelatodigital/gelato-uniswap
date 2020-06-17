// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
import bre from "@nomiclabs/buidler";

describe("Cleanup for Gelato-Kyber Demo Part 1: Step 6", function () {
  // No timeout for Mocha due to Rinkeby mining latency
  this.timeout(0);

  // We use our Provider Wallet
  let myProviderAddress;
  let myProviderWallet;

  // We will send a cleanup Transaction to GelatoCore on Rinkeby
  const gelatoCoreAddress = bre.network.config.deployments.GelatoCore;
  let gelatoCore;

  // --> Scrap from Step 1: Conditions and Actions
  // 1) We use the already deployed instance of ConditionTimeStateful
  const conditionTimeStatefulAddress =
    bre.network.config.deployments.ConditionTimeStateful;
  // 2) We use the already deployed instance of ActionKyberTrade
  const actionKyberTradeAddress =
    bre.network.config.deployments.ActionKyberTrade;

  // --> Scrap from Step 4:
  const kyberAction = new Action({
    addr: actionKyberTradeAddress, // The address of the contract with the Action logic
    data: constants.HashZero, // The exact Action payload is ignored for whitelisting
    operation: Operation.Delegatecall, // This Action must be executed via the UserProxy
    termsOkCheck: true, // Some sanity checks have to pass before Execution is granted
  });
  const updateConditionTimeAction = new Action({
    addr: conditionTimeStatefulAddress,
    data: constants.HashZero, // The exact Action payload is ignored for whitelisting
    operation: Operation.Delegatecall, // This Action must be executed via the UserProxy
  });
  const gelatoKyberTaskSpec = new TaskSpec({
    conditions: [conditionTimeStatefulAddress], // multiple conditions could be combined
    actions: [kyberAction, updateConditionTimeAction], // multiple actions could be combined
    gasPriceCeil: 1, // dummyValue
  });

  // --> Scrap from tep 5: Select a ProviderModule
  const providerModuleGelatoUserProxyAddress =
    bre.network.config.deployments.ProviderModuleGelatoUserProxy;

  // --> Step 6: Cleanup scrap from multiProvide tx
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

  // Remove Scrap from Step6 in 2 Transactions
  it("Unprovide everything complete", async function () {
    const executorIsAssignedToMe =
      (await gelatoCore.executorByProvider(myProviderAddress)) ==
      constants.AddressZero
        ? false
        : true;

    if (executorIsAssignedToMe) {
      // Cleanup TX-1:
      let providerAssignsExecutorTx;
      try {
        providerAssignsExecutorTx = await gelatoCore.providerAssignsExecutor(
          constants.AddressZero,
          {
            gasLimit: 6000000,
            gasPrice: utils.parseUnits("10", "gwei"),
          }
        );
      } catch (error) {
        console.error("\n Cleanup: PRE Executor cleanup TX ❌  \n", error);
        process.exit(1);
      }

      try {
        console.log(
          "\n Waiting for Executor unassignment TX to get mined .. \n"
        );
        await providerAssignsExecutorTx.wait();
        console.log("\n Executor unassigned ✅ \n ");
      } catch (error) {
        console.error("\n Executor Cleanup TX failed ❌ ", error);
        process.exit(1);
      }
    } else {
      console.log("\n Executor already not assigned ✅ ");
    }

    expect(await gelatoCore.executorByProvider(myProviderAddress)).to.be.equal(
      constants.AddressZero
    );

    const providedFunds = await gelatoCore.providerFunds(myProviderAddress);
    const fundsAreProvided = providedFunds.toString() === "0" ? false : true;

    const taskSpecIsProvided =
      (await gelatoCore.isTaskSpecProvided(
        myProviderAddress,
        gelatoKyberTaskSpec
      )) === "TaskSpecNotProvided"
        ? false
        : true;

    const moduleIsProvided = await gelatoCore.isModuleProvided(
      myProviderAddress,
      providerModuleGelatoUserProxyAddress
    );

    // Cleanup TX-2
    if (fundsAreProvided || taskSpecIsProvided || moduleIsProvided) {
      let multiUnprovideTx;
      try {
        multiUnprovideTx = await gelatoCore.multiUnprovide(
          providedFunds, // withdrawAmount
          taskSpecIsProvided ? [gelatoKyberTaskSpec] : [],
          moduleIsProvided ? [providerModuleGelatoUserProxyAddress] : [],
          { gasLimit: 6000000, gasPrice: utils.parseUnits("10", "gwei") }
        );
      } catch (error) {
        console.error("\n Cleanup: PRE multiUnprovide TX ❌  \n", error);
        process.exit(1);
      }
      try {
        console.log("\n Waiting for Funds, TaskSpec, Module cleanup... \n ");
        await multiUnprovideTx.wait();
        console.log("Cleanup complete ✅ ");
      } catch (error) {
        console.error("\n multiUnprovide TX failed ❌ ", error);
        process.exit(1);
      }
    } else {
      console.log("\n Funds, TaskSpec and Module already not provided ✅ \n");
    }

    // Now we check that our Provider account on GelatoCore is reset to start
    expect(await gelatoCore.providerFunds(myProviderAddress)).to.be.equal(0);
    expect(
      await gelatoCore.isTaskSpecProvided(
        myProviderAddress,
        gelatoKyberTaskSpec
      )
    ).to.be.equal("TaskSpecNotProvided");
    expect(
      await gelatoCore.isModuleProvided(
        myProviderAddress,
        providerModuleGelatoUserProxyAddress
      )
    ).to.be.false;
  });
});

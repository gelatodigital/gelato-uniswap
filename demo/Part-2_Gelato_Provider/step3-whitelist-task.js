// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
import bre from "@nomiclabs/buidler";
import { constants } from "ethers";

describe("Gelato-Uniswap Demo Part 2: Step 3", function () {
  // No timeout for Mocha due to Rinkeby mining latency
  this.timeout(0);

  // We use our Provider Wallet
  let myProviderAddress;
  let myProviderWallet;

  const DAI = bre.network.config.addressBook.erc20.DAI;
  const WETH = bre.network.config.addressBook.erc20.WETH;
  const UNISWAP_V2_Router_02 = bre.network.config.addressBook.uniswapV2.router2;

  // We will send a Transaction to GelatoCore on Rinkeby
  const gelatoCoreAddress = bre.network.config.deployments.GelatoCore;
  let gelatoCore;

  // --> Conditions & Actions => Task (see Step1 of Demo)
  // 1) We use the already deployed instance of ConditionTimeStateful
  const conditionTimeStatefulAddress =
    bre.network.config.deployments.ConditionTimeStateful;

    // 2) We instantiate the Actions objects that belong to the Task
  const actionTransferFrom = new Action({
    addr: DAI,
    data: constants.HashZero,
    operation: Operation.Call, // This Action must be executed via the UserProxy
  });

  const actionApproveUniswapRouter = new Action({
    addr: DAI,
    data: constants.HashZero,
    operation: Operation.Call, // This Action must be executed via the UserProxy
  });

  const tokenPath = [DAI, WETH];
  console.log(tokenPath);

  const actionSwapTokensUniswap = new Action({
    addr: UNISWAP_V2_Router_02,
    data: constants.HashZero,
    operation: Operation.Call, // This Action must be executed via the UserProxy
  });

    //  2.2a) We instantiate the Action obj that updates the ConditionTimeStateful
    //   with the time of the last automated trade.
  const actionUpdateConditionTime = new Action({
    addr: conditionTimeStatefulAddress,
    data: constants.HashZero,
    operation: Operation.Call, // This Action must be called from the UserProxy
  });
  // We also need to specify up to which gasPrice the Action should be executable
  const gasPriceCeil = constants.MaxUint256;

  // This is all the info we need for the TaskSpec whitelisting
  const gelatoUniswapTaskSpec = new TaskSpec({
    // All the conditions have to be met
    conditions: [conditionTimeStatefulAddress],
    // These Actions have to be executed in the same TX all-or-nothing
    actions: [
      actionTransferFrom,
      actionApproveUniswapRouter,
      actionSwapTokensUniswap,
      actionUpdateConditionTime,
    ],    
    gasPriceCeil,
  });

  before(async function () {
    // We get our Provider Wallet from the Buidler Runtime Env
    myProviderWallet = await bre.getProviderWallet();
    myProviderAddress = await myProviderWallet.getAddress();

    // Instantiate GelatoCore contract instance connected to our ProviderWallet
    gelatoCore = await ethers.getContractAt(
      "GelatoCore", // fetches the contract ABI from artifacts/
      gelatoCoreAddress, // the Rinkeby Address of the deployed GelatoCore
      myProviderWallet // We send a tx to the contract from our Provider Wallet
    );
  });

  it("External Provider whitelists TaskSpec", async function () {
    // First we want to make sure that we havent already provided the TaskSpec
    const taskSpecIsNotProvided =
      (await gelatoCore.isTaskSpecProvided(
        myProviderAddress,
        gelatoUniswapTaskSpec
      )) === "TaskSpecNotProvided"
        ? true
        : false;

    const currentGasPriceCeil = await gelatoCore.taskSpecGasPriceCeil(
      myProviderAddress,
      await gelatoCore.hashTaskSpec(gelatoUniswapTaskSpec)
    );

    // Transaction
    if (taskSpecIsNotProvided || !currentGasPriceCeil.eq(gasPriceCeil)) {
      let provideTaskSpec;
      try {
        provideTaskSpec = await gelatoCore.provideTaskSpecs(
          [gelatoUniswapTaskSpec],
          {
            gasLimit: 6000000,
            gasPrice: utils.parseUnits("10", "gwei"),
          }
        );
      } catch (error) {
        console.error("\n PRE provideTaskSpecs TX error ❌  \n", error);
        process.exit(1);
      }
      try {
        console.log("\n Waiting for provideTaskSpecs TX to get mined...");
        await provideTaskSpec.wait();
        console.log("\n provideTaskSpecs TX successfully mined ✅ \n");
      } catch (error) {
        console.error("\n provideTaskSpecs TX error ❌ ", error);
        process.exit(1);
      }
    } else {
      console.log("\n TaskSpec already provided ✅ \n");
    }

    // Making sure the TaskSpec was provided
    expect(
      await gelatoCore.isTaskSpecProvided(
        myProviderAddress,
        gelatoUniswapTaskSpec
      )
    ).to.be.equal("OK");

    expect(
      await gelatoCore.taskSpecGasPriceCeil(
        myProviderAddress,
        await gelatoCore.hashTaskSpec(gelatoUniswapTaskSpec)
      )
    ).to.be.equal(gasPriceCeil);
  });
});

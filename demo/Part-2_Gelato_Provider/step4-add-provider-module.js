// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
import bre from "@nomiclabs/buidler";

describe("Gelato-Kyber Demo Part 2: Step 4 => Add GelatoUserProxy ProviderModule", function () {
  // No timeout for Mocha due to Rinkeby mining latency
  this.timeout(0);

  // We use our Provider Wallet
  let myProviderAddress;
  let myProviderWallet;

  // We will send a Transaction to GelatoCore on Rinkeby
  const gelatoCoreAddress = bre.network.config.deployments.GelatoCore;
  let gelatoCore;

  // --> Step 5: Select a ProviderModule
  // For the demo we use the already deployed GelatoUserProxy ProviderModule
  // as Gelato automation requires our Users to have Smart Contract Proxies.
  // However, outside of the demo you should always make sure you deploy your own
  // ProviderModule, or at least use one that has immutable trust.
  const providerModuleGelatoUserProxyAddress =
    bre.network.config.deployments.ProviderModuleGelatoUserProxy;

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

  it("Transaction selecting GelatoUserProxy ProviderModule", async function () {
    // First we need to make sure that we have not already completed any of
    // Steps 2-5 before, lest we get a reverting transaction
    const moduleIsProvided = await gelatoCore.isModuleProvided(
      myProviderAddress,
      providerModuleGelatoUserProxyAddress
    );

    // The single Transaction that completes Steps 2-5: gelatoCore.multiProvide()
    if (!moduleIsProvided) {
      let addModuleTx;
      try {
        addModuleTx = await gelatoCore.addProviderModules(
          [providerModuleGelatoUserProxyAddress],
          {
            gasLimit: 6000000,
            gasPrice: utils.parseUnits("10", "gwei"),
          }
        );
      } catch (error) {
        console.error("\n PRE addModuleTx TX error ❌  \n", error);
        process.exit(1);
      }
      try {
        console.log("\n Waiting for addModuleTx TX to get mined...");
        await addModuleTx.wait();
        console.log("\n addModuleTx TX successfully mined ✅ \n");
      } catch (error) {
        console.error("\n addModuleTx TX error ❌ ", error);
        process.exit(1);
      }
    } else {
      console.log("\n Module already provided ✅ \n");
    }

    // Now we check that Steps 5 was completed successfully
    expect(
      await gelatoCore.isModuleProvided(
        myProviderAddress,
        providerModuleGelatoUserProxyAddress
      )
    ).to.be.true;
  });
});

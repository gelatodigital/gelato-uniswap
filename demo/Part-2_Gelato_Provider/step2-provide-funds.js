// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
import bre from "@nomiclabs/buidler";

describe("Gelato-Kyber Demo Part 2: Step 2", function () {
  // No timeout for Mocha due to Rinkeby mining latency
  this.timeout(0);

  // We use our Provider Wallet
  let myProviderAddress;
  let myProviderWallet;

  // We will send a Transaction to GelatoCore on Rinkeby
  const gelatoCoreAddress = bre.network.config.deployments.GelatoCore;
  let gelatoCore;

  // --> Step 3: Provide Funds
  // We provide 2 ETH to Gelato, so that many Task executions can happen
  const fundsToProvide = utils.parseEther("2");

  before(async function () {
    // We get our Provider Wallet from the Buidler Runtime Env
    myProviderWallet = await bre.getProviderWallet();
    myProviderAddress = await myProviderWallet.getAddress();
    const providerBalance = await myProviderWallet.getBalance();

    if (providerBalance.lt(fundsToProvide)) {
      console.log(
        `\n ❌  Insufficient funds on your Provider Wallet: ${myProviderAddress} \n`
      );
      console.log(
        "\n Funds needed: ",
        utils.formatEther(fundsToProvide).toString(),
        " ETH"
      );
      console.log(
        "\n Provider's current Balance: ",
        utils.formatEther(providerBalance).toString(),
        " ETH"
      );
      process.exit(1);
    }

    // Instantiate GelatoCore contract instance connected to our ProviderWallet
    gelatoCore = await ethers.getContractAt(
      "IGelatoProviders", // fetches the contract ABI from artifacts/
      gelatoCoreAddress, // the Rinkeby Address of the deployed GelatoCore
      myProviderWallet // We send a tx to the contract from our Provider Wallet
    );
  });

  it("External Provider deposits funds on gelato", async function () {
    // First we need to make sure that we have not already provided the funds
    const currentProviderFunds = await gelatoCore.providerFunds(
      myProviderAddress
    );

    // The single Transaction that completes Steps 2-5: gelatoCore.multiProvide()
    if (currentProviderFunds.lt(fundsToProvide)) {
      let provideFundsTx;
      try {
        provideFundsTx = await gelatoCore.provideFunds(myProviderAddress, {
          value: fundsToProvide,
          gasLimit: 6000000,
          gasPrice: utils.parseUnits("10", "gwei"),
        });
      } catch (error) {
        console.error("\n PRE provideFunds TX error ❌  \n", error);
        process.exit(1);
      }
      try {
        console.log("\n Waiting for provideFunds TX to get mined...");
        await provideFundsTx.wait();
        console.log("provideFunds TX successfully mined ✅ \n");
      } catch (error) {
        console.error("\n provideFunds TX error ❌ ", error);
        process.exit(1);
      }
    } else {
      console.log("\n Funds already provided ✅ \n");
    }

    // Now we check that we provided the Funds
    expect(await gelatoCore.providerFunds(myProviderAddress)).to.be.gte(
      fundsToProvide
    );
  });
});

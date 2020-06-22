// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
import bre from "@nomiclabs/buidler";

describe("Gelato-Kyber Demo Part 1: Step 2 => Executor Assignment", function () {
  // No timeout for Mocha due to Rinkeby mining latency
  this.timeout(0);

  // We use our Provider Wallet
  let myProviderWallet;
  let myProviderAddress;

  // We will send a Transaction to GelatoCore on Rinkeby
  const gelatoCoreAddress = bre.network.config.deployments.GelatoCore;
  let gelatoCore;

  // --> Step 2: Assign your Executor
  // We use Gelato's default Rinkeby Executor
  const gelatoDefaultExecutor =
    bre.network.config.addressBook.gelatoExecutor.default;

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

  it("Demo Part 1 Step2: Assign Gelato Default Executor", async function () {
    // First we need to make sure that we have not already assigned our Executor before
    const assignedExecutor = await gelatoCore.executorByProvider(
      myProviderAddress
    );

    // The single Transaction that completes Steps 2-5: gelatoCore.multiProvide()
    if (
      ethers.utils.getAddress(assignedExecutor) !==
      ethers.utils.getAddress(gelatoDefaultExecutor)
    ) {
      // Gelato requires Executors to be staked.
      expect(await gelatoCore.isExecutorMinStaked(gelatoDefaultExecutor)).to.be
        .true;

      if (assignedExecutor !== constants.AddressZero) {
        console.log(
          `\n Re-assign executor:${assignedExecutor} to gelato default executor\n`
        );
      }
      // Now we can safely send the assignment transaction.
      let assignExecutorTx;
      try {
        assignExecutorTx = await gelatoCore.providerAssignsExecutor(
          gelatoDefaultExecutor,
          {
            gasLimit: 6000000,
            gasPrice: utils.parseUnits("10", "gwei"),
          }
        );
      } catch (error) {
        console.error("\n PRE Assignment TX error ❌  \n", error);
        process.exit(1);
      }
      try {
        console.log("\n Waiting for assignment TX to get mined...");
        await assignExecutorTx.wait();
        console.log("Assignment TX mined and ok ✅ \n");
      } catch (error) {
        console.error("\n Assignment TX error ❌ ", error);
        process.exit(1);
      }
    } else {
      console.log("\n Already assigned gelato default Executor ✅\n");
    }

    // Lastly we check that Steps 2-5 were completed successfully
    expect(await gelatoCore.executorByProvider(myProviderAddress)).to.be.equal(
      gelatoDefaultExecutor
    );
  });
});

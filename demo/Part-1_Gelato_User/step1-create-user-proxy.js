// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
import bre from "@nomiclabs/buidler";

describe("Gelato-Kyber Demo Part 1: Step 1 => Create GelatoUserProxy", function () {
  // No timeout for Mocha due to Rinkeby mining latency
  this.timeout(0);

  // We use our User Wallet. Per our config this wallet is at the accounts index 0
  // and hence will be used by default for all transactions we send.
  let myUserWallet;
  let myUserAddress;

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
  const CREATE_2_SALT = 42069; // for create2 and address prediction

  before(async function () {
    // We get our User Wallet from the Buidler Runtime Env
    myUserWallet = await bre.getUserWallet();
    myUserAddress = await myUserWallet.getAddress();

    // --> Step 1: Deploy your GelatoUserProxy
    gelatoUserProxyFactory = await ethers.getContractAt(
      "IGelatoUserProxyFactory",
      gelatoUserProxyFactorAddress
    );

    // We will later deploy a GelatoUserProxy, using the Factory's create2 method,
    //  which allows us to already predict the myUserProxyAddress now, by using the
    //  same SALT for create2 later. However, we first check if we already created
    //  a proxy before.
    myUserProxyAddress = await gelatoUserProxyFactory.predictProxyAddress(
      myUserAddress,
      CREATE_2_SALT
    );
    proxyIsDeployedAlready = await gelatoUserProxyFactory.isGelatoUserProxy(
      myUserProxyAddress
    );
    if (proxyIsDeployedAlready) {
      console.log("UserProxy already deployed ✅ \n");
      process.exit(0);
    }
  });

  it("Transaction to deploy your GelatoUserProxy", async function () {
    // Transaction to deploy your GelatoUserProxy a
    // If we have not deployed our GelatoUserProxy yet, we deploy it and submit our
    // TaskCycle via the GelatoUserProxyFactory
    let proxyDeploymentTx;
    try {
      console.log("\n Sending Transaction to create GelatoUserProxy!");
      proxyDeploymentTx = await gelatoUserProxyFactory.createTwo(
        CREATE_2_SALT,
        {
          gasLimit: 4000000,
          gasPrice: utils.parseUnits("10", "gwei"),
        }
      );
    } catch (error) {
      console.error("\n PRE proxyDeploymentTx error ❌  \n", error);
      process.exit(1);
    }
    try {
      console.log("\n Waiting for proxyDeploymentTx to get mined...");
      await proxyDeploymentTx.wait();
      console.log("UserProxy deployed ✅ \n");
    } catch (error) {
      console.error("\n POST proxyDeploymentTx error ❌ ", error);
      process.exit(1);
    }

    expect(await gelatoUserProxyFactory.isGelatoUserProxy(myUserProxyAddress))
      .to.be.true;
  });
});

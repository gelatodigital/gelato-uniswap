// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
import bre from "@nomiclabs/buidler";
import DataFlow from "../../src/enums/gelato/DataFlow";

describe("Gelato-Uniswap Demo Part 1: Step 4", function () {
  // No timeout for Mocha due to Rinkeby mining latency
  this.timeout(0);

  // We use our User Wallet. Per our config this wallet is at the accounts index 0
  // and hence will be used by default for all transactions we send.
  let myUserAddress;

  const gelatoUserProxyFactorAddress =
    bre.network.config.deployments.GelatoUserProxyFactory;

  let gelatoUserProxyFactory;

  const actionTransfer = bre.network.config.deployments.ActionTransfer;

  let proxyIsDeployedAlready;
  let myUserProxyAddress;
  let myUserProxy;
  const CREATE_2_SALT = 42069; // for create2 and address prediction

  // We deposit 1 ETH to Gelato, so that we have a sufficient balance for Task executions
  const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

  // User Setup: 1) Deposit 1 ETH on gelato, 2) Assign default execution network and 3) whitelist ProviderModule for the selected Proxy Standard (GelatoUserProxy or Gnosis Safe)
  before(async function () {
    // We get our User Wallet from the Buidler Runtime Env
    const myUserWallet = await bre.getUserWallet();
    myUserAddress = await myUserWallet.getAddress();

    gelatoUserProxyFactory = await ethers.getContractAt(
      "IGelatoUserProxyFactory",
      gelatoUserProxyFactorAddress
    );

    //  We expect our Proxy to have been created using the Factory's create2 method,
    //  in Demo Part 2 Step 1, which allows us to already predict
    //  the myUserProxyAddress now, by using the same SALT.
    //  Make sure we have created the Proxy already.
    myUserProxyAddress = await gelatoUserProxyFactory.predictProxyAddress(
      myUserAddress,
      CREATE_2_SALT
    );
    proxyIsDeployedAlready = await gelatoUserProxyFactory.isGelatoUserProxy(
      myUserProxyAddress
    );

    if (proxyIsDeployedAlready) {
      myUserProxy = await ethers.getContractAt(
        "GelatoUserProxy",
        myUserProxyAddress
      );
    } else {
      console.log(
        "❌ No GelatoUserProxy deployed. Complete Part2 Step 1 first by running `yarn create-userproxy`\n"
      );
      process.exit(1);
    }
  });

  it("Withdraw remaining ETH from Gelato", async function () {
    // Instantiate GelatoCore contract instance for sanity checks
    const gelatoCore = await ethers.getContractAt(
      "GelatoCore", // fetches the contract ABI from artifacts/
      network.config.deployments.GelatoCore // the Rinkeby Address of the deployed GelatoCore
    );

    const balanceOnGelato = await gelatoCore.providerFunds(myUserProxyAddress);

    const withdrawAction = new Action({
      addr: gelatoCore.address,
      data: await bre.run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "unprovideFunds",
        inputs: [balanceOnGelato /* userProxyFunds */],
      }),
      operation: Operation.Call, // This Action must be executed via the UserProxy
      dataFlow: DataFlow.None,
      termsOkCheck: false,
    });

    const transferAction = new Action({
      addr: actionTransfer,
      data: await bre.run("abi-encode-withselector", {
        contractname: "ActionTransfer",
        functionname: "action",
        inputs: [ETH_ADDRESS, balanceOnGelato, myUserAddress],
      }),
      operation: Operation.Delegatecall, // This Action must be executed via the UserProxy
      dataFlow: DataFlow.None,
      termsOkCheck: false,
    });

    // The single Transaction that 1) Deposits ETH on gelato, 2) selects the default gelato execution network and 3) tells gelato you are a GelatoUserProxy
    {
      let withdrawTx;
      try {
        console.log("\n Sending Transaction to withdraw excess funds!");
        withdrawTx = await myUserProxy.multiExecActions(
          [withdrawAction, transferAction],
          {
            gasLimit: 1000000,
            gasPrice: utils.parseUnits("10", "gwei"),
          }
        );
      } catch (error) {
        console.error("\n PRE withdrawTx error ❌  \n", error);
        process.exit(1);
      }
      try {
        console.log(
          `\n Waiting for withdrawTx ${withdrawTx.hash} to get mined...`
        );
        await withdrawTx.wait();
        console.log("\n Withdraw Tx succesfully mined ✅ \n");
        console.log(`
        \n Successfully withdrawed ${ethers.utils.formatEther(
          balanceOnGelato
        )} ETH back to User ${myUserAddress}`);
      } catch (error) {
        console.error("\n POST withdrawTx error ❌ ", error);
        process.exit(1);
      }
    }
  });
});

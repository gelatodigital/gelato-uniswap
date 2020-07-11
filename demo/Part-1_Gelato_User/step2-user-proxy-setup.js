// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
import { expect } from "chai";

// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
import bre from "@nomiclabs/buidler";
import DataFlow from "../../src/enums/gelato/DataFlow";

describe("Gelato-Kyber Demo Part 1: Step 2", function () {
  // No timeout for Mocha due to Rinkeby mining latency
  this.timeout(0);

  // We use our User Wallet. Per our config this wallet is at the accounts index 0
  // and hence will be used by default for all transactions we send.
  let myUserAddress;

  const gelatoUserProxyFactorAddress =
    bre.network.config.deployments.GelatoUserProxyFactory;
  let gelatoUserProxyFactory;

  let proxyIsDeployedAlready;
  let myUserProxyAddress;
  let myUserProxy;
  const CREATE_2_SALT = 42069; // for create2 and address prediction

  const defaultExecutor = bre.network.config.addressBook.gelatoExecutor.default;
  const gelatoUserProxyProviderModule =
    network.config.deployments.ProviderModuleGelatoUserProxy;

  // We deposit 1 ETH to Gelato, so that we have a sufficient balance for Task executions
  const fundsToDeposit = utils.parseEther("1");

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

  it("Deposit ETH on GelatoCore, select default Gelato Execution Network and tell Gelato what kind of a proxy will interact with it via UserProxy", async function () {
    // Instantiate GelatoCore contract instance for sanity checks
    const gelatoCore = await ethers.getContractAt(
      "GelatoCore", // fetches the contract ABI from artifacts/
      network.config.deployments.GelatoCore // the Rinkeby Address of the deployed GelatoCore
    );

    // For the Demo, make sure the Provider has the Gelato default Executor assigned
    const assignedExecutor = await gelatoCore.executorByProvider(
      myUserProxyAddress // As the User is being his own provider, we will use the userProxy's address as the provider address
    );

    let isDefaultExecutorAssigned =
      ethers.utils.getAddress(assignedExecutor) ===
      ethers.utils.getAddress(defaultExecutor)
        ? true
        : false;
    if (isDefaultExecutorAssigned)
      console.log("\n Default Executor already assigned");

    // If the user wants to use Gelato through their GelatoUserProxy, he needs to register the GelatoUserProxyProviderModule to make his GelatoUserProxy compatible with Gelato

    // Here we check if the User already enabled the GelatoUserProxyProviderModule.
    //  If not, we will enable it in the upcoming Tx.
    const isUserProxyModuleWhitelisted = await gelatoCore.isModuleProvided(
      myUserProxyAddress,
      gelatoUserProxyProviderModule
    );

    if (isUserProxyModuleWhitelisted)
      console.log("\n UserProxyModule already whitelisted");

    /*
    Function that the User Proxy should call:
      gelatoCore.multiProvide(
        address _executor,
        TaskSpec[] memory _taskSpecs,
        IGelatoProviderModule[] memory _modules
      )
    */

    // Now we create an Action object, that the Gelato User Proxy will use to call a certain function on Gelato Core.
    // If the default executor was already assigned, we will pass AddressZero, to skip the executor assignment alltogether
    // If the User already whitelisted the GelatoUserProxyMProviderModule, then we pass an empty [] to avoid a revert on-chain
    // Don't forget to pass the "fundsToDeposit" as the value in order for the proxy to send ETH to Gelato
    const userSetupAction = new Action({
      addr: gelatoCore.address,
      data: await bre.run("abi-encode-withselector", {
        contractname: "GelatoCore",
        functionname: "multiProvide",
        inputs: [
          isDefaultExecutorAssigned ? constants.AddressZero : defaultExecutor,
          [], // this can be left empty, as it is only relevant for external providers
          isUserProxyModuleWhitelisted ? [] : [gelatoUserProxyProviderModule],
        ],
      }),
      operation: Operation.Call, // This Action must be called from the UserProxy
      value: fundsToDeposit,
      dataFlow: DataFlow.None, // Not relevant here
      termsOkCheck: false, // Not relevan here
    });

    // The single Transaction that 1) Deposits ETH on gelato, 2) selects the default gelato execution network and 3) tells gelato you are a GelatoUserProxy
    {
      let userSetupTx;
      try {
        console.log("\n Sending Transaction to set up user proxy!");
        userSetupTx = await myUserProxy.execAction(userSetupAction, {
          gasLimit: 500000,
          gasPrice: utils.parseUnits("10", "gwei"),
          value: fundsToDeposit, // The ETH will be transfered from the EOA to the userProxy and then deposited to Gelato
        });
      } catch (error) {
        console.error("\n PRE userSetupTx error ❌  \n", error);
        process.exit(1);
      }
      try {
        console.log("\n Waiting for userSetupTx to get mined...");
        await userSetupTx.wait();
        console.log("\nUser Proxy succesfully set up ✅ \n");
        console.log(`
        \n Deposited ${ethers.utils.formatEther(fundsToDeposit)} ETH on gelato
        \n Selected default execution network: ${defaultExecutor}
        \n Whitelisted following provider module: ${gelatoUserProxyProviderModule} \n`);
      } catch (error) {
        console.error("\n POST userSetupTx error ❌ ", error);
        process.exit(1);
      }
    }
  });
});

// ES6 module imports via require
require("@babel/register");

// Libraries
const assert = require("assert");
const { constants, errors, utils } = require("ethers");

// Disable ethers v4 warnings e.g. for solidity overloaded fns
errors.setLogLevel("error");

// Process Env Variables
require("dotenv").config();
const INFURA_ID = process.env.DEMO_INFURA_ID;
const USER_PK = process.env.DEMO_USER_PK;
const PROVIDER_PK = process.env.DEMO_PROVIDER_PK;
assert.ok(INFURA_ID, "no Infura ID in process.env");
assert.ok(USER_PK, "no User private key (USER_PK) found in .env");
assert.ok(PROVIDER_PK, "no Provider private key (Provider_PK) found in .env");

// ================================= CONFIG =========================================
module.exports = {
  defaultNetwork: "rinkeby",
  networks: {
    rinkeby: {
      // Standard
      accounts: [USER_PK, PROVIDER_PK],
      chainId: 4,
      // gas: 4000000,  // 4 million
      // gasPrice: "auto",
      url: `https://rinkeby.infura.io/v3/${INFURA_ID}`,
      // Custom
      // Rinkeby: addressBook
      addressBook: {
        // Rinkeby: erc20s
        erc20: {
          DAI: "0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa",
          "0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa": "DAI",
          KNC: "0x6FA355a7b6bD2D6bD8b927C489221BFBb6f1D7B2",
          "0x6FA355a7b6bD2D6bD8b927C489221BFBb6f1D7B2": "KNC",
        },

        // Rinkeby: Gelato
        gelatoExecutor: {
          default: "0xa5A98a6AD379C7B578bD85E35A3eC28AD72A336b", // PermissionedExecutors
        },

        // Rinkeby: Kyber
        kyber: {
          ETH: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          networkProxy: "0x0d5371e5EE23dec7DF251A8957279629aa79E9C5",
        },
      },

      // Rinkeby: Contracts
      contracts: [
        // === Actions ===
        // Kyber
        "ActionKyberTrade",
        // Provider
        "FeeHandlerFactory",
        "GelatoTokenFaucet",
        // === Conditions ===
        // Time
        "ConditionTimeStateful",
        // === GelatoCore ===
        "GelatoCore",
        // === ProviderModules ===
        "ProviderModuleGelatoUserProxy",
      ],

      // Rinkeby: Deployments
      deployments: {
        // ==== Actions ====
        // Kyber
        ActionKyberTrade: "0x605e0d68996a110E516271884bdc93a574eBD89a",
        // Transfer
        ActionTransfer: "0x783bD05d52B02811dECC8960aBF38A56c9Fb5F9B",
        // Provider
        FeeHandlerFactory: "0x6988f5c52E0b6Bdcf6d0223e65a4C49F0c2cb1F8",
        // ==== Conditions ====
        // Time
        ConditionTimeStateful: "0xcA560E4399399016d897983206aB591CAD19169C",
        // ===== Gelato Core ====
        GelatoCore: "0x733aDEf4f8346FD96107d8d6605eA9ab5645d632",
        // === GelatoUserProxies ===
        GelatoUserProxyFactory: "0x0309EC714C7E7c4C5B94bed97439940aED4F0624",
        // ===== Provider Modules ====
        ProviderModuleGelatoUserProxy:
          "0x66a35534126B4B0845A2aa03825b95dFaaE88B0C",
        GelatoTokenFaucet: "0xbA7A7187EF22fE2B001bF8e4707B66B3985F5805",
      },

      // Rinkeby: Filters
      filters: {
        defaultFromBlock: 6699941,
        defaultToBlock: "latest",
      },
    },
  },
  solc: {
    version: "0.6.10",
    optimizer: { enabled: true },
  },
};

// Classes
const Action = require("./src/classes/gelato/Action").default;
const Condition = require("./src/classes/gelato/Condition").default;
const GelatoProvider = require("./src/classes/gelato/GelatoProvider").default;
const Task = require("./src/classes/gelato/Task").default;
const TaskSpec = require("./src/classes/gelato/TaskSpec").default;
const TaskReceipt = require("./src/classes/gelato/TaskReceipt").default;
// Objects/Enums
const Operation = require("./src/enums/gelato/Operation").default;
const DataFlow = require("./src/enums/gelato/DataFlow").default;

// Helpers
// Async
const sleep = require("./src/helpers/async/sleep").default;
// Gelato
const convertTaskReceiptArrayToObj = require("./src/helpers/gelato/convertTaskReceiptArrayToObj")
  .default;
const convertTaskReceiptObjToArray = require("./src/helpers/gelato/convertTaskReceiptObjToArray")
  .default;
// Nested Arrays
const nestedArraysAreEqual = require("./src/helpers/nestedArrays/nestedArraysAreEqual")
  .default;
// Nested Objects
const checkNestedObj = require("./src/helpers/nestedObjects/checkNestedObj")
  .default;
const getNestedObj = require("./src/helpers/nestedObjects/getNestedObj")
  .default;

// ================================= BRE extension ==================================
extendEnvironment((bre) => {
  // DEMO
  bre.userAddress = bre.network.config.addressBook.user;
  bre.providerAddress = bre.network.config.addressBook.provider;
  bre.userProxyAddress = bre.network.config.addressBook.userProxy;
  bre.getUserWallet = async () => {
    const [userWallet] = await bre.ethers.getSigners();
    return userWallet;
  };
  bre.getProviderWallet = async () => {
    const [_, providerWallet] = await bre.ethers.getSigners();
    return providerWallet;
  };
  // Classes
  bre.Action = Action;
  bre.Condition = Condition;
  bre.GelatoProvider = GelatoProvider;
  bre.Task = Task;
  bre.TaskSpec = TaskSpec;
  bre.TaskReceipt = TaskReceipt;
  // Objects/Enums
  bre.Operation = Operation;
  bre.DataFlow = DataFlow;
  // Functions
  // Async
  bre.sleep = sleep;
  // Gelato
  bre.convertTaskReceiptArrayToObj = convertTaskReceiptArrayToObj;
  bre.convertTaskReceiptObjToArray = convertTaskReceiptObjToArray;
  // Nested Arrays
  bre.nestedArraysAreEqual = nestedArraysAreEqual;
  // Nested Objects
  bre.checkNestedObj = checkNestedObj;
  bre.getNestedObj = getNestedObj;
  // Libraries
  bre.constants = constants;
  bre.utils = utils;
});

// ================================= PLUGINS =========================================
usePlugin("@nomiclabs/buidler-ethers");
usePlugin("@nomiclabs/buidler-waffle");

// ================================= TASKS =========================================
// task action function receives the Buidler Runtime Environment as second argument

// ============== ABI
require("./buidler/tasks/abi/collection.tasks.abi");

// ============== BRE
// BRE, BRE-CONFIG(:networks), BRE-NETWORK
require("./buidler/tasks/bre/collection.tasks.bre");

// ======================== DEMO ======================================
// require("./demo/Part-1_Gelato_Providers/step1.1-deploy-fee-contract");
// require("./demo/Part-1_Gelato_Providers/step1.2-whitelist-fee-token");

// ============== DEPLOY
require("./buidler/tasks/deploy/collection.tasks.deploy");

// ============== ERC20
require("./buidler/tasks/erc20/collection.tasks.erc20");

// ============= GELATO
// CORE
// TaskReceipts ...
require("./buidler/tasks/gelato/core/collection.tasks.gelato-core");

// ======================== INTERNAL HELPER TASKS ======================================
// encoding, naming ....
require("./buidler/tasks/internal/collection.internalTasks");

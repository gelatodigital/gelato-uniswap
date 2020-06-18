import bre from "@nomiclabs/buidler";
import { utils } from "ethers";

// We expect 4 balance changes
let balanceChangeCounter = 0;

let myUserWallet;
let myUserAddress;
let myProviderAddress;

// We also want to keep track of token balances in our UserWallet
let myUserWalletETHBalance;
let myUserWalletDAIBalance;
let myUserWalletKNCBalance;

// We also want to track the Provider DAI Balance to check for Provider Fees
let myProvidersDAIBalance;

async function logBalances() {
  try {
    // const DAI = bre.network.config.addressBook.erc20.DAI;
    // const KNC = bre.network.config.addressBook.erc20.KNC;
    const CREATE_2_SALT = 42069; // for create2 and address prediction

    // We get our User Wallet from the Buidler Runtime Env
    myUserWallet = await bre.getUserWallet();
    myUserAddress = await myUserWallet.getAddress();

    const gelatoUserProxyFactory = await ethers.getContractAt(
      "IGelatoUserProxyFactory",
      bre.network.config.deployments.GelatoUserProxyFactory
    );
    const myUserProxyAddress = await gelatoUserProxyFactory.predictProxyAddress(
      myUserAddress,
      CREATE_2_SALT
    );

    // We also want to keep track of token balances in our UserWallet
    myUserWalletETHBalance = await myUserWallet.getBalance();
    myUserWalletDAIBalance = await bre.run("erc20-balance", {
      erc20name: "DAI",
      owner: myUserAddress,
    });
    myUserWalletKNCBalance = await bre.run("erc20-balance", {
      erc20name: "KNC",
      owner: myUserAddress,
    });

    // We also monitor the DAI approval our GelatoUserProxy has from us
    const myUserProxyDAIAllowance = await bre.run("erc20-allowance", {
      owner: myUserAddress,
      erc20name: "DAI",
      spender: myUserProxyAddress,
    });

    // We also want to track the Provider DAI Balance to check for Provider Fees
    // We get our Provider Wallet from the Buidler Runtime Env
    const myProviderWallet = await bre.getProviderWallet();
    myProviderAddress = await myProviderWallet.getAddress();
    myProvidersDAIBalance = await bre.run("erc20-balance", {
      owner: myProviderAddress,
      erc20name: "DAI",
    });

    const formatMyUserWalletETHBalance = utils
      .formatEther(myUserWalletETHBalance)
      .toString();
    const formatMyUserWalletDAIBalance = utils
      .formatEther(myUserWalletDAIBalance)
      .toString();
    const formatMyUserWalletKNCBalance = utils
      .formatEther(myUserWalletKNCBalance)
      .toString();
    const formatMyUserProxyDAIAllowance = utils
      .formatEther(myUserProxyDAIAllowance)
      .toString();
    const formatMyProvidersDAIBalance = utils
      .formatEther(myProvidersDAIBalance)
      .toString();

    const status = balanceChangeCounter > 0 ? "NEW" : "Current";
    console.log(
      `\n ___💰 ${status} Token BALANCES! ____💰
        \n myUserWallet ETH Balance: ${formatMyUserWalletETHBalance} ETH\n
        \n myUserWalletDAIBalance:   ${formatMyUserWalletDAIBalance} DAI\n
        \n myUserWalletKNCBalance:   ${formatMyUserWalletKNCBalance} KNC\n
        \n myUserProxyDAIAllowance:  ${formatMyUserProxyDAIAllowance} DAI\n
        \n myProvidersDAIBalance:    ${formatMyProvidersDAIBalance} DAI\n`
    );
    if (balanceChangeCounter == 3) {
      console.log("\n 3 Balance changes observed ✅ ");
      console.log("\n DEMO FINISHED 🍦  GREAT SUCCESS! ");
      process.exit(0);
    } else {
      console.log("\n ⏰  Listening for new Balance changes ... ⏰  ");
    }
  } catch (error) {
    console.error("\n ❌ logBalances", error);
  }
}

async function monitorBalancesAndLogChange() {
  try {
    const userWalletETHBalance = await myUserWallet.getBalance();
    const userWalletETHBalanceChanged = userWalletETHBalance.eq(
      myUserWalletETHBalance
    )
      ? false
      : true;

    const userWalletDAIBalance = await bre.run("erc20-balance", {
      erc20name: "DAI",
      owner: myUserAddress,
    });
    const userWalletDAIBalanceChanged = userWalletDAIBalance.eq(
      myUserWalletDAIBalance
    )
      ? false
      : true;

    const userWalletKNCBalance = await bre.run("erc20-balance", {
      erc20name: "KNC",
      owner: myUserAddress,
    });
    const userWalletKNCBalanceChanged = userWalletKNCBalance.eq(
      myUserWalletKNCBalance
    )
      ? false
      : true;

    const providersDAIBalance = await bre.run("erc20-balance", {
      owner: myProviderAddress,
      erc20name: "DAI",
    });
    const providersDAIBalanceChanged = providersDAIBalance.eq(
      myProvidersDAIBalance
    )
      ? false
      : true;

    if (
      userWalletETHBalanceChanged ||
      userWalletDAIBalanceChanged ||
      userWalletKNCBalanceChanged ||
      providersDAIBalanceChanged
    ) {
      balanceChangeCounter++;
      await logBalances();
    }
  } catch (error) {
    console.error("\n ❌ monitorBalancesAndLogChange", error);
  }
}

async function main() {
  await logBalances();
  monitorBalancesAndLogChange();
  setInterval(monitorBalancesAndLogChange, 20 * 1000);
}
main().catch((err) => console.error(err));

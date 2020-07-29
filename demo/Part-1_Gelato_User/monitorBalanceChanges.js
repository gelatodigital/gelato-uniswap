import bre from "@nomiclabs/buidler";
import { utils } from "ethers";

// We expect 4 balance changes
let balanceChangeCounter = 0;

let myUserWallet;
let myUserAddress;
let myProviderAddress;

// We also want to keep track of token balances in our UserWallet
let myUserWalletETHBalance;
let myUserWalletKNCBalance;

async function logBalances() {
  try {
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
    myUserWalletKNCBalance = await bre.run("erc20-balance", {
      erc20name: "KNC",
      owner: myUserAddress,
    });

    // We also monitor the KNC approval our GelatoUserProxy has from us
    const myUserProxyKNCAllowance = await bre.run("erc20-allowance", {
      owner: myUserAddress,
      erc20name: "KNC",
      spender: myUserProxyAddress,
    });

    const formatMyUserWalletETHBalance = utils
      .formatEther(myUserWalletETHBalance)
      .toString();
    const formatMyUserWalletKNCBalance = utils
      .formatEther(myUserWalletKNCBalance)
      .toString();
    const formatMyUserWalletKNCAllowance = utils
      .formatEther(myUserProxyKNCAllowance)
      .toString();

    const status = balanceChangeCounter > 0 ? "NEW" : "Current";
    console.log(
      `\n ___💰 ${status} Token BALANCES! ____💰
        \n myUserWallet ETH Balance: ${formatMyUserWalletETHBalance} ETH\n
        \n myUserWallet KNC Balance:   ${formatMyUserWalletKNCBalance} KNC\n
        \n myUserWallet KNC Allowance:   ${formatMyUserWalletKNCAllowance} KNC\n
        `
    );
    if (balanceChangeCounter == 3) {
      console.log("\n 3 Balance changes observed ✅ ");
      console.log("\n DEMO FINISHED 🍦 GREAT SUCCESS! ");
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

    const userWalletKNCBalance = await bre.run("erc20-balance", {
      erc20name: "KNC",
      owner: myUserAddress,
    });
    const userWalletKNCBalanceChanged = userWalletKNCBalance.eq(
      myUserWalletKNCBalance
    )
      ? false
      : true;

    if (userWalletETHBalanceChanged || userWalletKNCBalanceChanged) {
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

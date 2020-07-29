import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "get-token-faucet",
  `Return (or --log) <erc20address> allowance by <owner> to <spender> on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "address",
    "address of desired token to receive 50 from the faucet"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    const myUserWallet = await getUserWallet();
    const myUserAddress = await myUserWallet.getAddress();
    const tokenFaucetAbi = ["function mint(address _token)"];

    const tokenFaucet = await ethers.getContractAt(
      tokenFaucetAbi,
      network.config.deployments.GelatoTokenFaucet
    );

    let tx;
    try {
      tx = await tokenFaucet.mint(taskArgs.address);
      console.log(`\n Tx hash: ${tx.hash}\n`);

      await tx.wait();
      console.log(
        `\n Successfully transferred 50 tokens of token ${taskArgs.address} to your User account: ${myUserAddress}\n`
      );
      return tx.hash;
    } catch (error) {
      console.log(
        `\n You already requested the token faucet today, you have to wait 24h from the last time you called it in order to get another 50: ${taskArgs.address}`
      );
    }
  });

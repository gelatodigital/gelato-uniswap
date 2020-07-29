import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "get-tokenFaucet",
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
      network.config.deployments.GelatoTokenFaucet
    );
    const tx = await tokenFaucet.mint(taskArgs.address);
    console.log(`\n Tx hash: ${tx.hash}\n`);
    await tx.wait();
    console.log(
      `\n Successfully transferred 50 tokens of token ${taskArgs.address} tokenFaucet to your User account: ${myUserAddress}\n`
    );
    return tx.hash;
  });

import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "get-dai",
  `Return (or --log) <erc20address> allowance by <owner> to <spender> on [--network] (default: ${defaultNetwork})`
)
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    const myUserWallet = await getUserWallet();
    const myUserAddress = await myUserWallet.getAddress();
    const daiAbi = [
      "function allocateTo(address _userAddress, uint256 _amount)",
    ];

    const dai = await ethers.getContractAt(
      daiAbi,
      "0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa"
    );
    const tx = await dai.allocateTo(
      myUserAddress,
      ethers.utils.parseUnits("100", 18)
    );
    console.log(`\n Tx hash: ${tx.hash}\n`);
    await tx.wait();
    console.log(
      `\n Successfully transferred 100 Rinkeby DAI to your User account: ${myUserAddress}\n`
    );
    return tx.hash;
  });

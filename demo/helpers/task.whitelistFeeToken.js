import { task } from "@nomiclabs/buidler/config";
import { constants } from "ethers";

export default task("gelato-whitelist-fee-token", `...`)
  .addPositionalParam(
    "feetoken",
    "list of fee tokens to be accepted by the fee actions"
  )
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ feetoken }) => {
    try {
      const provider = await getProviderWallet();

      // Check if Provider State Setter is already deployed
      const feeHandlerFactory = await run("instantiateContract", {
        contractname: "FeeHandlerFactory",
        signer: provider,
        write: true,
      });

      console.log(`Tokens to be included for your fee actions:`);
      console.log(`${feetoken}\n`);

      // We dont have a FeeHandler for this fee yet, lets deploy a new one
      const tx = await feeHandlerFactory.addTokensToWhitelist([feetoken]);

      const etherscanLink = await run("get-etherscan-link", {
        txhash: tx.hash,
      });
      console.log(etherscanLink);
      await tx.wait();
      console.log(`✅ Tx mined - Fee Tokens updated`);

      return `✅ Tx mined`;
    } catch (error) {
      console.error(error, "\n");
      console.log(`❌ Tx failed`);
      process.exit(1);
    }
  });

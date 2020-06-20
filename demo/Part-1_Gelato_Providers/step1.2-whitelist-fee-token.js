import { task } from "@nomiclabs/buidler/config";

export default task(
  "whitelist-fee-token",
  "Whitelist a Token that you accept fees in on your FeehandlerFactory"
)
  .addPositionalParam("feeToken", "The feeToken you want to accept")
  .setAction(async ({ feeToken }) => {
    try {
      // Gets your Provider wallet from the runtime environment
      const providerWallet = await getProviderWallet();
      const providerAddress = await providerWallet.getAddress();

      // FeeHandlerFactory centralizes your Token Whitelist management across
      // all your deployed FeeHandlers (e.g. 1% fee, 2% fee, etc.)
      const feeHandlerFactory = await run("instantiateContract", {
        contractname: "FeeHandlerFactory",
        signer: providerWallet,
        write: true,
      });

      const tokenAlreadyWhitelisted = await feeHandlerFactory.isWhitelistedToken(
        providerAddress,
        feeToken
      );

      if (tokenAlreadyWhitelisted) {
        console.log(`\n ✅ ${feeToken} already whitelisted \n`);
      } else {
        console.log(`\n Sending TX to whitelist new Fee Token`);

        // We dont have a FeeHandler for this fee yet, lets deploy a new one
        const tx = await feeHandlerFactory.addTokensToWhitelist([feeToken]);
        await tx.wait();

        console.log(`\n ✅ Tx mined\n ${feeToken} included as Fee Token`);

        return tx.hash;
      }
    } catch (error) {
      console.error("\n ❌ FeeToken Whitelisting TXfailed \n", error);
      process.exit(1);
    }
  });

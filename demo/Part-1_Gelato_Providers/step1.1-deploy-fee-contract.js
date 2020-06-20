import { task } from "@nomiclabs/buidler/config";
import { constants } from "ethers";

export default task(
  "deploy-gelato-provider-fee-handler",
  `Deploys a ActionFeeHandler contract and sets its percentage fee`
)
  .addPositionalParam("percentageFee", "Fee as a percentage")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ percentageFee }) => {
    try {
      const providerWallet = await getProviderWallet();
      const providerAddress = await providerWallet.getAddress();

      // Check if Provider ActionFeeHandler is already deployed
      const feeHandlerFactory = await run("instantiateContract", {
        contractname: "FeeHandlerFactory",
        signer: providerWallet,
        write: true,
      });

      // The ActionFeeHandlerContract specifies this format
      const feeNumerator = (percentageFee / 100) * 10000;

      // We determine whether we already deployed an ActionFeeHandler before
      let feeHandlerAddress = await feeHandlerFactory.feeHandlerByProviderAndNum(
        providerAddress,
        feeNumerator
      );

      if (feeHandlerAddress !== constants.AddressZero) {
        console.log(
          `\n FeeHandler is already deployed at ${feeHandlerAddress}\n`
        );
        console.log(`
          \n => Make sure it is listed inside "buidler.config.js" "deployments": ❗
          \n  ActionFeeHandler: "${feeHandlerAddress}\n
        `);
      } else {
        // We dont have a FeeHandler for this fee yet, lets deploy one via the Factory
        const tx = await feeHandlerFactory.create(feeNumerator);

        // Wait for deployment tx to be mined
        await tx.wait();

        // Get the newly deployed FeeHandler address
        feeHandlerAddress = await feeHandlerFactory.feeHandlerByProviderAndNum(
          providerAddress,
          feeNumerator
        );

        console.log(`
          \n FeeHandler Action Address: ${feeHandlerAddress}\

          \n => Next go to "buidler.config.js" and add this to "deployments": ❗
          \n  ActionFeeHandler: "${feeHandlerAddress}"

          \n Fee: ${percentageFee} %

          \n This Action lets the Task Provider charge fees. \n
        `);
      }
      return feeHandlerAddress;
    } catch (error) {
      console.error("\n ❌ ActionFeeHandler deployment failed \n", error);
      process.exit(1);
    }
  });

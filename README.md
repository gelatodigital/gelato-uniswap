<p  align="center"><img  src="https://media.giphy.com/media/LkNg7wWovGSCcOv7Hc/giphy.gif"  width="500px"/></p>

<h1  align="center">Tutorial: Building an automated trading dapp using Gelato & Kyber</h1>

- [Getting Started](#getting-started)

  - [Setup](#setup)
  - [Clone this repo](#clone-this-repo)
  - [Environment](#environment)

- [Tutorial](#gelato-demo-automated-kyber)

  - [Part 1: You become a Gelato Provider](#demo-part-1-you-become-a-gelato-provider)

    - [Step 1: Gelato Conditions, Actions, and Tasks](#step-1-gelato-conditions-actions-and-tasks)
      - [Gelato Providers & Executors](#gelato-providers--executors)
    - [Step 2: Assign your Executor](#step-2-assign-your-executor)
    - [Step 3: Provide Funds](#step-3-provide-funds)
    - [Step 4: Whitelist Tasks](#step-4-whitelist-tasks)
    - [Step 5: Add a ProviderModule](#step-5-add-a-providermodule)

  - [Part 2: Be your own Gelato-Kyber User](#demo-part-2-be-your-own-gelato-kyber-user)
    - [Step 1: Deploy your GelatoUserProxy](#step-1-deploy-your-gelatouserproxy)
    - [Step 2: Submit your Task to Gelato via your GelatoUserProxy](#step-2-submit-your-task-to-gelato-via-your-gelatouserproxy)

- [Build your own use case](#build-your-own-use-case-using-gelato)

# Getting Started

## Setup

- `node.js`
- `yarn` (or `npm`)
- [Infura](https://infura.io/) project ID (free tier)
- 2 Private Keys (you can generate and export them from e.g. [Metamask](https://metamask.io/))
- `Rinkeby` `ETH` on both private keys.
- `Rinkeby` `DAI` on your first private key (DEMO_USER_PK)

If you don't have 2 Private Keys you can use ready, the easiest way is to take two of your Metamask accounts and click `Account Details` and then `Export Private Key`. You can copy it from there. Check out how to export your private keys [here](https://metamask.zendesk.com/hc/en-us/articles/360015289632-How-to-Export-an-Account-Private-Key).

**CAUTION: Do not share your Private Key with anyone!**

You can get `Rinkeby` `ETH` from the faucet. The faucet asks you to make a social media post with the `account` `address` (as displayed in `Metamask`) corresponding to the Private Keys. DO NOT SHARE THE PRIVATE KEYS THEMSELVES EVER!

Deposit at least 2.5 ETH to the account of the DEMO_PROVIDER_PK and at least 0.5 ETH to the account of DEMO_USER_PK

Link to `Rinkeby` `ETH` [faucet](https://faucet.rinkeby.io/).

You can get `Rinkeby` `DAI` from [Compound's Rinkeby UI](https://app.compound.finance/). Deposit at least 3 DAI to the account of the DEMO_USER_PK

1. Visit the page and make sure you are logged in to `Metamask` and select the `Rinkeby Test Network` in `Metamask`.
2. In the left `Supply` column click on `Dai`
3. In the pop-up click on `Withdraw`
4. At the bottom of the pop-up click on `Faucet`
5. Confirm in `Metamask`
6. Add this `Custom Token` `address` to your `Metamask`: `0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa` (Rinkeby DAI)
7. You should now have `100 Rinkeby Dai` from the `Compound Faucet`

## Clone this repo

```
git clone https://github.com/gelatodigital/gelato-kyber.git

cd gelato-kyber

yarn install  # or npm install

```

You will probably see some `gyp-error` depending on which version of `node` you use. Don't worry about it.

## Environment

Add a `.env` file to the project root level:

```
touch .env
```

:exclamation: **Make sure `.env` is in `.gitignore` !**

Add add the following contents filled in with your data to `.env`.

```
DEMO_INFURA_ID="<Put your Infura Project ID in here>"
DEMO_USER_PK="<Put your First Private Key in here>"
DEMO_PROVIDER_PK="<Put your Second Private Key in here>"
```

:exclamation: **Make sure your Private Keys are prefixed with `0x`**

This will allow the scripts that you will later run in this demo, to use your `Provider` and your `User` Wallets.

In order to run the following scripts, you must first compile the smart contracts. Run:

```
npx buidler compile
```

# Tutorial

Follow the Steps of this walkthrough demo, to learn how you can use Gelato to build your Dapp that enables Users to `automatically trade DAI for KNC on the KyberNetwork DEX every X minutes/days/weeks`.

Watch your console for confirmation text and green ticks :white_check_mark:

If there are errors :x: please open an Issue in this repo.

**Note:** This demo is on Rinkeby only as of now

## Demo Part 1: You become a Gelato Provider

### Step 1: Setting up the Fee Logic

For developers like you, Gelato starts with you either writing and deploying your own `Conditions` and/or `Actions` smart contracts, or selecting ones that have been deployed by someone else.

The `Actions` define what Gelato should automate for your Users.

The `Conditions` define when the `Actions` should be performed.

For this demo we will combine a single `Condition` with a single `Action`, but it is also possible to combine several `Conditions` with several `Actions` into one `Task`. A `Gelato Task` is just the combination of `Conditions` with `Actions`.

Here, we define our `Task` like so:

- `Condition`: **Every 2 minutes** (or every time a certain timestamp has been reached on Ethereum)

- `Action`: **Trade 1 DAI for KNC on KyberNetwork** (call the trade function on the kyber network smart contract)

- `Task`: **Every 2 minutes, trade 1 DAI for KNC on KyberNetwork**

For this Demo, both the necessary Condition and Action smart contracts have already been written and deployed to Rinkeby for you. If you are a curious Solidity developer, you can check out their code here:

- [`contracts/gelato_conditions/ConditionTimeStateful.sol`](https://github.com/gelatodigital/gelato-kyber/blob/master/contracts/gelato_conditions/ConditionTimeStateful.sol)
- [`contracts/gelato_actions/ActionKyberTrade.sol`](https://github.com/gelatodigital/gelato-kyber/blob/master/contracts/gelato_actions/ActionKyberTrade.sol)

#### Gelato Providers & Executors

Gelato consists of a **network of relay servers** that are being incentivized to **execute** certain `Tasks` **for the Users of your Dapp**.

These `Executors` need to be paid, in order to operate their automation infrastructure and get compensated for submitting transactions.

In Gelato **`Providers` pay `Executors`** to **automate** `Tasks`.

There are two kinds of `Providers`:

1. `External Providers`, which pay `Executors` on behalf of his/her Dapp Users. These are dapp developers that want to provide users with a great UX by removing the necessity of depositing ETH on gelato from them.
2. `Self-Provider`, which are End-Users that pa `Executors` directly, and thus have to deposit on gelato before being able to use it.

In this demo you will be an `External Provider` that pays `Executors` on behalf of Users.

However, you will be compensated for paying your Users transactions, by taking a 10% share of their `DAI` (0.1 DAI) each time they automatically trade them for `KNC`.

This is achieved with a special Gelato Action contract that you will now **deploy** and **configure** to take **10% of DAI as a fee**. This fee will automatically be sent to your `Provider` account for every one of your Users' automatic trades. If you are curious, check out your Provider Fee contract here:

- [`contracts/gelato_actions/ActionFeeHandler.sol`](https://github.com/gelatodigital/gelato-kyber/blob/master/contracts/gelato_actions/ActionFeeHandler.sol)

In reality, you would probably take a much lower fee. The 10% is just for demonstration.

Go ahead and deploy your own `ActionFeeHandler` that will always take a 10% cut of whatever Tokens your Users are trading with:

```
npx buidler deploy-gelato-provider-fee-handler 10
```

You can check out the script here

- [`demo/Part-1_Gelato_Providers/step1.1-deploy-fee-contract.js`](https://github.com/gelatodigital/gelato-kyber/blob/master/demo/Part-1_Gelato_Providers/step1.1-deploy-fee-contract.js)

**Make sure to copy & paste the `address` of your deployed `ActionFeeHandler` into this project's `buidler.config.js` file under `deployments.ActionFeeHandler`. You will find a comment in the file to guide you.**

Lastly, we want our **Provider fee to be paid in `DAI`**. So we have to configure our fee contract by running this command:

```
npx buidler whitelist-fee-token 0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa
```

Remember: `0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa` is the address of `DAI` on Rinkeby.

You can check out the script here

- [`demo/Part-1_Gelato_Providers/step1.2-whitelist-fee-token.js`](https://github.com/gelatodigital/gelato-kyber/blob/master/demo/Part-1_Gelato_Providers/step1.2-whitelist-fee-token.js)

### Step 2: Assign your Executor

`Providers` have to assign an `Executor` to their Users' `Tasks`.

This `Executor` could be a single entity running a node, or it could be a smart contract that runs a `decentralized execution market`, which incentivises a multitude of independent actors to run `Gelato execution nodes`, thus avoiding a `single-point-of-failure`.

`Providers` can `reassign` new `Executors` at any time.

In this demo, you will assign **Gelato's Default Executor** to your Users' tasks.

Run this:

```
yarn assign-executor
```

or

```
npm run assign-executor
```

You can check out the script here

- [`demo/Part-1_Gelato_Providers/step2-assign-executor.js`](https://github.com/gelatodigital/gelato-kyber/blob/master/demo/Part-1_Gelato_Providers/step2-assign-executor.js)

### Step 3: Deposit Funds on Gelato

Providers must lock funds inside Gelato, to pay for their Users' `Task` executions.

Run this script to lock up `2 ETH` inside Gelato.

Before, make sure you have `2 ETH` on your Rinkeby `Provider` account.

```
yarn provide-funds
```

or

```
npm run provide-funds
```

You can check out the script here:

- [`demo/Part-1_Gelato_Providers/step3-provide-funds.js`](https://github.com/gelatodigital/gelato-kyber/blob/master/demo/Part-1_Gelato_Providers/step3-provide-funds.js)

You can always withdraw the funds from Gelato at any time (by running `yarn batch-unprovide`).

### Step 4: Whitelist Task Specs

Providers must list the type of `Tasks` that they pay `Exectuors` for. As a `Provider` you want to make sure that your Users can only submit the type of `Task` that you have preapproved, so that you, for example, make sure that the `Task` has your fee mechanism encoded into it. This blueprint of a `Task` is called a `TaskSpec`.

Whitelist the **Kyber Automation Task** of this demo that is linked to your **FeeHandler** `Action`, by running this:

```
yarn whitelist-task
```

or

```
npm run whitelist-task
```

You can check out the script here:

- [`demo/Part-1_Gelato_Providers/step4-whitelist-task.js`](https://github.com/gelatodigital/gelato-kyber/blob/master/demo/Part-1_Gelato_Providers/step4-whitelist-task.js)

### Step 5: Add a ProviderModule

Gelato requires Users to use Smart Contract `Proxies`.

This is because the Users' Task execution is carried out via their own `Proxies`, so that the Users themselves don't have to be online for it.

`Providers` must use `ProviderModule` smart contracts that contain logic specific to what Smart Contract Accounts (`Proxies`) their Users use on Gelato.

For this demo your Users will be using `GelatoUserProxies` on Gelato. Theoretically, they could use any Smart Contract Proxy, such as a `GnosisSafe` or `Maker`'s `DSProxy`.

We already have a `GelatoUserProxy` `ProviderModule` deployed for you.

Run this in order to whitelist it:

```
yarn add-provider-module
```

or

```
npm run add-provider-module
```

You can check out the script here:

- [`demo/Part-1_Gelato_Providers/step5-add-provider-module.js`](https://github.com/gelatodigital/gelato-kyber/blob/master/demo/Part-1_Gelato_Providers/step5-add-provider-module.js)

### Demo Part 1 **END**

We have now completed all the chores, in order for our automated Gelato-Kyber Dapp users, to be able to submit their `Tasks`. Remember:

- You will pay the `Task` `Executor` that you assigned in `Step 2` on your Users behalves with the funds that you provided to Gelato in `Step 3`.
- In return, you will take a 10% DAI fee (0.1 DAI per trade) from your Users, as you configured in `Step 1` and `Step4`.

By the way, you can also complete Steps 2-5 in a single Transaction via this command:

```
yarn batch-provide
```

or

```
npm run batch-provide
```

If you are interested in the code, take a peek at this script:

- [`demo/Part-1_Gelato_Providers/batch-provide.js`](https://github.com/gelatodigital/gelato-kyber/blob/master/demo/Part-1_Gelato_Providers/batch-provide.js)

Onward to Demo Part 2, and buckle up for some Gelato magic :icecream:

:icecream: :icecream: :icecream:
:icecream: :icecream: :icecream:

:icecream: :icecream: :icecream:
:icecream: :icecream: :icecream:

## Demo Part 2: Start using the automated trading dapp as a User

In Part 2, we will take up the role of one of our own Dapp Users and see how Gelato works its automation magic for them in action.

The scripts will be using your `DEMO_USER_PK` as a `Wallet`. Make sure you have Rinkeby ETH on there.

### Step 1: Create your GelatoUserProxy

As a Gelato Dapp User, you submit your Task via a your Smart Contract Account or `Proxy`. In this demo, our `Provider` has specified in Part 1 Step 5 that this should be a `GelatoUserProxy`.

Run this to create your `GelatoUserProxy`:

```
yarn create-userproxy
```

or

```
npm run add-provider-module
```

- [`demo/Part-2_Gelato_Users/step1-create-user-proxy.js`](https://github.com/gelatodigital/gelato-kyber/blob/master/demo/Part-2_Gelato_Users/step1-create-user-proxy.js)

:icecream: :icecream: :icecream:

### Step 2: Submit your Task to Gelato via your GelatoUserProxy

In this example, the user wants to instruct Gelato to execute 3 trades in total on its behalf, each swapping 1 DAI to KNC after a certain time has passed.

The script we will run submits our `Task` to gelato. We are setting a limit of three executions to Gelato, to limit the number of automatic trades we want to occur. We could potentially also instruct gelato to submit inifinite tasks until the provider's ETH balance runs out.

Spelled out this will mean:

**For 3 times, every 2 minutes, trade 1 DAI for KNC on KyberNetwork**

Due to the `Provider fee payment` of **10% in DAI** that is part of our `Task` this will translate into **3 trades of 0.9 DAI to KNC** each, with **0.1 DAI flowing to our Provider from each trade**.

The script will also `approve` your `GelatoUserProxy` for `3 DAI` from your UserWallet. Your `Proxy` needs access to any funds needed for your Task, so that it can execute it on your behalf. This means that the DAI will remain in the Users Wallet until the condition os fulfilled and the User's proxy withdraws them out in order to trade on the Users behalf.

The script will keep on running listenting for events and printing information to the console as soon as an automatic trade was detected.

If you want to, you can also import your `USER_PK` and `PROVIDER_PK` into your `Metamask` browser extension and watch your `USER` and `Provider` account balances for `DAI` and `KNC` change there.
Remember, all of this is on Rinkeby. So if you use Metamask, you need to add these Custom Tokens to your GUI, to check out your balances there.

`DAI=0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa`

`KNC=0x6FA355a7b6bD2D6bD8b927C489221BFBb6f1D7B2`

Now for the Grande Finale and the Gelato magic to happen, run this script:

```
yarn submit-task-via-user-proxy-and-monitor

```

or

```
npm run submit-task-via-user-proxy-and-monitor
```

**Wait for about 8 minutes for the script to complete.**

If you are interested in the code that was run, take a peek at this script:

- [`demo/Part-2_Gelato_Users/step2-submit-task.js`](https://github.com/gelatodigital/gelato-kyber/blob/master/demo/Part-2_Gelato_Users/step2-submit-task.js)

### Demo Part 2 **END**

Just under 10 minutes have passed since we ran the `yarn submit-task-via-user-proxy-and-monitor` command.

We should have observed in the running script output, or from our Metamask GUI, that **1 `DAI`** was **swapped** for **`KNC`** in **3 intervals** roughly **every 2 minutes**.

We should have observed that our Provider Wallet's `DAI` balance went up by **1 `DAI`** for each of the 3 automated trades that occured - a total of `3 DAI` in fees.

By the way, Gelato also allows you to `create` a `GelatoUserProxy` and `submit Tasks` via it, in a single transaction.

If you are interested, take a peek at this script:

- [`demo/Part-2_Gelato_Users/create-proxy-and-submitTask.js`](https://github.com/gelatodigital/gelato-kyber/blob/master/demo/Part-2_Gelato_Users/create-proxy-and-submitTask.js)

**If you are done with the Demo, you can cleanup after yourself and withdraw your Provider funds from Gelato back to your Provider Wallet by running this command**

```
yarn batch-unprovide
```

or

```
npm run batch-unprovide
```

If you are interested in the code, take a peek at this script:

- [`demo/Part-1_Gelato_Providers/batch-unprovide.js`](https://github.com/gelatodigital/gelato-kyber/blob/master/demo/Part-1_Gelato_Providers/batch-unprovide.js)

### **END** of the Turorial

# Build your own use case using gelato

To build your own use case using gelato, check out this part of our main repo [here](https://github.com/gelatodigital/gelato-network/tree/master/src/demo)

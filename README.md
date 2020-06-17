<p  align="center"><img  src="https://i.imgur.com/ZvVG2b1.png"  width="250px"/></p>

<h1  align="center">A demo walkthrough of Gelato Kyber Automation</h1>

- [Getting Started](#getting-started)
  - [Setup](#setup)
  - [Clone this repo](#clone-this-repo)
  - [Environment](#environment)
- [GELATO DEMO: AUTOMATED KYBER](#gelato-demo-automated-kyber)
  - [Demo Part 1: You become a Gelato Provider](#demo-part-1-you-become-a-gelato-provider)
    - [Step 1: Gelato Conditions, Actions, and Tasks](#step-1-gelato-conditions-actions-and-tasks)
      - [Gelato Providers & Executors](#gelato-providers--executors)
    - [Step 2: Assign your Executor](#step-2-assign-your-executor)
    - [Step 3: Provide Funds](#step-3-provide-funds)
    - [Step 4: Whitelist Tasks](#step-4-whitelist-tasks)
    - [Step 5: Select a ProviderModule](#step-5-select-a-providermodule)
    - [Step 6: Complete Steps 2-5 in one Transaction](#step-6-complete-steps-2-5-in-one-transaction)
    - [Demo Part 1 **END**](#demo-part-1-end)
  - [Demo Part 2: Be your own Gelato-Kyber User](#demo-part-2-be-your-own-gelato-kyber-user)
    - [Step 1: Deploy your GelatoUserProxy](#step-1-deploy-your-gelatouserproxy)
    - [Step 2: Submit your Task to Gelato via your GelatoUserProxy](#step-2-submit-your-task-to-gelato-via-your-gelatouserproxy)
    - [Demo Part 2 **END**](#demo-part-2-end)

# Getting Started

## Setup

- `node.js`
- `yarn` (or `npm`)
- [Infura](https://infura.io/) project ID (free tier)
- 2 Private Keys (you can generate and export them from e.g. [Metamask](https://metamask.io/))
- `Rinkeby` `ETH` on both private keys.
- `Rinkeby` `DAI` on your first private key (DEMO_USER_PK)

If you don't have 2 Private Keys you can use ready, the easiest way is to take two of your Metamask accounts and click `Account Details` and then `Export Private Key`. You can copy it from there. **CAUTION: Do not share your Private Key with anyone!**

You can get `Rinkeby` `ETH` from the faucet. The faucet asks you to make a social media post with the `account` `address` (as displayed in `Metamask`) corresponding to the Private Keys. DO NOT SHARE THE PRIVATE KEYS THEMSELVES EVER!

Link to `Rinkeby` `ETH` [faucet](https://faucet.rinkeby.io/).

You can get `Rinkeby` `DAI` from [Compound's Rinkeby UI](https://app.compound.finance/).
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

Add a `.env` file to the project root level with the following entries:

**Make sure `.env` is in `.gitignore` !**

```
DEMO_INFURA_ID="<Put your Infura Project ID in here>"
DEMO_USER_PK="<Put your First Private Key in here>"
DEMO_PROVIDER_PK="<Put your Second Private Key in here>"
```

# GELATO DEMO: AUTOMATED KYBER

**Follow the Steps of this walkthrough demo, to learn how you can use Gelato to build your Dapp that enables Users to `automatically trade ETH for KNC on KyberNetwork every X minutes/days/weeks`... .**

**If you have already completed the Demo once and want to go again, run `unprovide` first**

```
yarn unprovide
```
or
```
npm run unprovide
```

:icecream: :icecream: :icecream:
:icecream: :icecream: :icecream:

## Demo Part 1: You become a Gelato Provider

### Step 1: Gelato Conditions, Actions, and Tasks

For the developer, Gelato starts with you either deploying your own `Condition` and/or `Action` smart contracts, or selecting ones that have been deployed by someone else.

The `Action` defines what Gelato should automate for your Users.

The `Condition` defines when the `Action` should be performed.

For this demo we will define them as such:
- `Condition`: **Every 2 minutes**

- `Action`: **Trade 10 DAI for KNC on KyberNetwork**

A `Gelato Task` is just the combination of the `Condition` with the `Action`.
- `Task`: **Every 2 minutes, trade 10 DAI for KNC on KyberNetwork**

For this Demo we have completed Step1 for you and both the necessary Condition and Action smart contracts are deployed for you on Rinkeby. If you are a curious Solidity developer, you can check out their code here:
- [`contracts/gelato_conditions/ConditionTimeStateful.sol`](https://github.com/gelatodigital/gelato-kyber/blob/master/contracts/gelato_conditions/ConditionTimeStateful.sol)
- [`contracts/gelato_actions/ActionKyberTrade.sol`](https://github.com/gelatodigital/gelato-kyber/blob/master/contracts/gelato_actions/ActionKyberTrade.sol)

#### Gelato Providers & Executors
Gelato **automates `Task` execution** by incentivising a **network of relay servers** to **execute** them **for your Dapp Users**.

These `Executors` need to be paid, in order to operate their automation infrastructure.

In Gelato **`Providers` pay `Executors`** to **automate** their `Tasks`.

There are two kinds of `Providers`:
1. `Provider`: pays `Executors` on behalf of his/her Dapp Users
2. `Self-Provider`: a Dapp User that pays `Executors` himself/herself

In this demo you will be a good `Provider` to your Users and pay the `Executors` yourself.

However, you will make revenue from providing for your Users Task executions by taking a 10% share of their `DAI` (1 DAI) each time they automatically trade them for `KNC`.

This is achieved with a special Gelato Action contract that was already deployed and setup for you for this demo. If you are curious, check out the contract here:
- [`contracts/gelato_actions/ActionFeeHandler.sol`](https://github.com/gelatodigital/gelato-kyber/blob/master/contracts/gelato_actions/ActionFeeHandler.sol)

In reality, you would probably take a much lower fee. The 10% is just for demonstration.

:icecream: :icecream: :icecream:

### Step 2: Assign your Executor
**Providers have to assign an `Executor` to their Users' `Tasks`**

You will select your `Executor` in **Step 6**.

:icecream: :icecream: :icecream:

### Step 3: Provide Funds
**Providers must lock funds inside Gelato, to pay for `Task` executions**

You will lock up ETH inside Gelato in **Step 6**.

:icecream: :icecream: :icecream:

### Step 4: Whitelist Tasks
**Providers must list the type of `Tasks` `Executors` should executor for them.**

You will whitelist the **Kyber Automation Task** that is linked to your **FeeHandler**  `Action`, in **Step 6**.

:icecream: :icecream: :icecream:

### Step 5: Select a ProviderModule
**Gelato requires Users to use Smart Contract `Proxies`.**

`Providers` use `ProviderModule` smart contracts to specify the logic needed for their Users' `Proxies`.

For this demo your Users will be using `GelatoUserProxies` on Gelato.

We already have a `GelatoUserProxy` `ProviderModule` deployed for you. Outside of this demo you should always vet that such a third-party module has immutable trust, or simply deploy your own `ProviderModule` that only you can mutate.

You will select this module in **Step 6**.

:icecream: :icecream: :icecream:

### Step 6: Complete Steps 2-5 in one Transaction
Run this demo script which will send a `transaction` to `Gelato` (on `Rinkeby`), that completes Steps 2-5 for you, using your `DEMO_PROVIDER_PK` as a `Wallet`. Make sure you have Rinkeby ETH on there.

Watch your console for confirmation text and green ticks :white_check_mark:.

If there are errors :x:, please open an Issue in this repo.

If you use `yarn`:
```
yarn provide
```

If you use `npm`:

```
npm run provide
```

If you are interested in the code that was run, take a peek at this script:
- [`demo/Part-1_Gelato_Providers/step6-provide.js`](https://github.com/gelatodigital/gelato-kyber/blob/master/demo/Part-1_Gelato_Providers/step6-provide.js)

### Demo Part 1 **END**

We have now completed all the chores, in order for our automated Gelato-Kyber Dapp users, to be able to submit their `Tasks`.

Onward to Demo Part 2, and buckle up for some Gelato magic :icecream:

:icecream: :icecream: :icecream:
:icecream: :icecream: :icecream:

:icecream: :icecream: :icecream:
:icecream: :icecream: :icecream:

## Demo Part 2: Be your own Gelato-Kyber User
In Part 2, we will take up the role of one of our own Dapp Users and see how Gelato works its automation magic for them in action.

### Step 1: Deploy your GelatoUserProxy
**Your Gelato Dapp Users will submit their Tasks via their `GelatoUserProxies`**

You will do this via the Command Line in **Step 2**.

:icecream: :icecream: :icecream:

### Step 2: Submit your Task to Gelato via your GelatoUserProxy
We will submit our `Task` as a so-called `Task Cycle` of length 3 to Gelato, to limit the number of automatic trades we want to occur. Spelled out our `Task Cycle` will mean:

**For 3 times, every 2 minutes, trade 10 DAI for KNC on KyberNetwork**

Due to the  `Provider fee payment` of **10% in DAI** that is part of our `Task` this will translate to **3 trades of 9 DAI to KNC** each, with **1 DAI flowing to our Provider from each trade**.

Run this demo script which will send a `transaction` to `Gelato` (on `Rinkeby`) via your `GelatoUserProxy` that completes Steps 1 and 2 for you, using your `DEMO_USER_PK` as a `Wallet`. Make sure you have Rinkeby ETH on there.

Watch your console for confirmation text and green ticks :white_check_mark:

If there are errors :x: please open an Issue in this repo.

**The script will keep on running listenting for events and printing information to the console as soon as an automatic trade was detected.**

If you want to, you can also import your `USER_PK` and `PROVIDER_PK` into your `Metamask` browser extension and watch the two account balances for `DAI` and `KNC` change there.
Remember, all of this is on Rinkeby. So if you use Metamask, you need to add these Custom Tokens to your GUI, to check out your balances there.

`DAI=0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa`

`KNC=0x6FA355a7b6bD2D6bD8b927C489221BFBb6f1D7B2`

If you use `yarn`:
```
yarn submit-task-via-userproxy
```

If you use `npm`:

```
npm run submit-task-via-userproxy
```

If you are interested in the code that was run, take a peek at this script:
- [`demo/Part-2_Gelato_Users/step2-submitTaskViaProxy.js`](https://github.com/gelatodigital/gelato-kyber/blob/master/demo/Part-2_Gelato_Users/step2-submitTaskViaProxy.js)

**Wait for about 8 minutes for the script to complete.**

### Demo Part 2 **END**

Just under 10 minutes have passed since we ran the `yarn submit-task-via-userproxy` command.

We should have observed in the running script output, or from our Metamask GUI, that **10 `DAI`** were **swapped** for **`KNC`** in **3 intervals** roughly **every 2 minutes**.

We should have observed that our Provider Wallet's `DAI` balance went up by **1 `DAI`** for each of the 3 automated trades that occured - a total of `3 DAI` in fees.

**If you are done with the Demo, you can cleanup after yourself and withdraw your Provider funds from Gelato back to your Provider Wallet by running this command**
```
yarn unprovide
```

:icecream: :icecream: :icecream:
:icecream: :icecream: :icecream:

:icecream: :icecream: :icecream:
:icecream: :icecream: :icecream:
# Bonding Curve Survey

[Extended Notes and other implementations](https://docs.google.com/document/d/1fBoe1enG_M7ReIycURh_uH6k9mmGz_Sp07j19mCcKCo/edit#)

### Purpose
*To present a summary state of affairs of bonding curves and select the most interesting existing model(s) and implementation(s) to move forward with the BC-DAO project.*

We also want to take into consideration that:

- Bonding curve functionality and implementations will evolve likely rapidly
- We want to handle interfacing with a number of curve implementations.
- We want to evaluate what will be favored by dxDAO, as we are hoping they will use the CF functionality developed in GECO.

## Bonding Curves: Feature Overview

An overview of the features one would conceivably want a bonding curve to support. This will likely evolve as new ideas emerge.

### Core Curve Features

- *Curve Function*: Linear, Polynomial, Logarithmic, etc.
    - (More complex math and computational costs demands a reason imo - I'd like to see some solid reasoning for one curve or another.) [This article discusses](https://medium.com/thoughtchains/on-single-bonding-curves-for-continuous-token-models-a167f5ffef89)
    - Ideally you would be able to make your own equation of arbitrary complexity
- *ReserveRatio*: % relationship between buy and sell prices
- *Spread/Split* (separate buy and sell curves)**:** Perhaps someone would want more control here

### Financial Features

- *Taxes* - A % fee for selling back to the market can be added to encourage secondary market trading.
- *Hatching* - An initial buying phase where selling is disabled up until a certain amount of tokens are bought. This helps ensure a certain amount of return for early investors.
- *Vesting* - Vesting periods can be added to minted tokens, which helps fight against pumping and dumping.
- *Governance* - Voting power can be given to token holders, which can help further insulate their potentially risky investment. (potentially through locking down the token)
- *Dividends* - Token holders can also be given claims on cash flow of the DAO. This claim can be made on revenues the DAO realizes both in the form of direct customer payments, or via shareholder payouts the DAO chooses to distribute.
- *Donations* - users are allowed to donate the reserve currency without getting tokens. (This can be withdrawn by the owner?)
- *Multicurrency Support* - Allow multiple tokens to be added to reserve.

### Security Features

- *Front-running Guards* (Order batching, Expected price, Max gas price)

## Relevant Implementations

### [C-Org](https://github.com/C-ORG/whitepaper) / [Fairmint](https://github.com/Fairmint/c-org) (active development)

Revenue injected into curve to raise token price

- buy(), sell(), burn(), pay(), close()

- "split" approach (as opposed to "spread")

\+ implicit dividend mechanism – revenue()

\- rapidly changing (recently started)

\- only supports linear curve

\- no front-running guards

### [Aragon Fundraising](https://github.com/AragonBlack/fundraising) (active development)

Funds withdrawn by organization through rate limited tap, token is used for governance of funds

- buy(), sell(), transfer()

- More info [[1]](https://github.com/1Hive/Apiary)[[2]](https://blog.aragon.org/introducing-aragon-fundraising/)

\+ batched bonding front-running guard

\+ multi-collateral

\- No dividend mechanism; Tokens are used for governance

\- Closely coupled with AragonOS

### [Batched Bonding](https://github.com/okwme/BatchedBondingCurves) (active development)

Batch buy and sell orders to prevent front-running (combine all the sells into one order, then split it among the participants of the sell. Then combine all of the buy orders into one, then split it among the buyers.)

- More info [[1]](https://observablehq.com/@okwme/batched-bonding-curves)

### [Milky Way](https://github.com/convergentcx/milky-way/tree/master/contracts) (archived)

Composable Bonding Curve Library

\+ Composable

\- No dividend mechanism

### [Band Protocol](https://github.com/bandprotocol/contracts) (production)

- More info [[1]](https://developer.bandprotocol.com/docs/bonding-curve.html):

- has some sort of inflation/deflation mechanism

- [Bonding Curve Factory](https://github.com/bandprotocol/contracts/blob/master/contracts/factory/BondingCurveFactory.sol)

\+ Composable, dynamic curves

\- No dividend mechanism

## Common Elements

BancorPower.sol

BancorFormula.sol

### Bonding Curve: Equation Considerations

- Actual product adoption for successful projects will likely resemble an S-curve (sigmoid).

- "when we are designing curves that span several magnitudes, price tends to stay very low for 80% of the curve, then inevitably accelerates to unmanageable and unreasonable levels very quickly."

- A logarithmic curve might also be appropriate.


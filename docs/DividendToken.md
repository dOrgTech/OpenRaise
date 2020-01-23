# Dividend Bearing Tokens

ERC20-compliant tokens that distribute pro-rata dividend payments among token holders in real time. Token holders can claim what they are entitled to at any time. When tokens are traded, the new owner gets rights to future claims.

## Current Limitations

- **Dividends are only distributed on pay()** - Without hooks on ERC20 transfers, we can't execute distribution logic when ERC20 tokens are transferred to the BondingCurve via the standard transfer() method. Ideally, we could allow 'native' ERC20 payments to function just as pay() does.

  - We'll be incorporating ERC777 hooks, which will alleviate this issue for tokens that adopt that standard.

- **Payments directly to DAO Avatar can circumvent dividends** - It's possible for actors to bypass the bonding curve and send payments directly to the DAO Avatar. If customers pay the DAO directly rather than sending payment with the pay() function to the bonding curve, then the DAO would receive 100% of the payment, effectively cutting out token holders from receiving their portion.

  - For instance, DutchX fees might initially be configured to hit the pay() function on the bonding curve, resulting in continuous cash-flows to both token-holders (in the form of claimable dividends) and the DAO according to **dividendPercentage**. However, the DAO might vote to re-route the fees directly to itself, avoiding the pay split with token holders.

  - We believe that the chances of such a coordinated attack will remain extremely low – as long as the prospects for continued funding are valued more than the present level of cash-flows. If the DAO was detected trying to "cheat" its token-holders in this way, we would expect a chain reaction of sell-offs and little to no prospect for future buys. Thus, the DAO would short-sightedly lose all ability to fundraise and would need to rely solely on its existing sources of revenue.

  - We have an open discussion on this issue [here](https://github.com/dOrgTech/BC-DAO/issues/4).

'use strict';
process.env.NODE_ENV = 'test';

import {ZWeb3, Contracts} from '@openzeppelin/upgrades';

ZWeb3.initialize(web3.currentProvider);

//TODO: Have these automatically set based on network chosen
//Standard network defaults
// Contracts.setArtifactsDefaults({
//   gas: 6721975,
//   gasPrice: 100000000000
// });

//Solidity coverage network defaults
Contracts.setArtifactsDefaults({
  gas: 17592186044415,
  gasPrice: 1
});

require('chai')
  .use(require('@openzeppelin/upgrades').assertions)
  .should();

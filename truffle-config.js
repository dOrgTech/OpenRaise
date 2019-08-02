require('dotenv').config();

require('@babel/register');
require('@babel/polyfill');

const mnemonic = process.env.MNENOMIC;
const HDWalletProvider = require('truffle-hdwallet-provider');

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*'
    },
    coverage: {
      host: '127.0.0.1',
      network_id: '*',
      port: 8555, // <-- If you change this, also set the port option in .solcover.js.
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01 // <-- Use this low gas price
    },
    ropsten: {
      provider: () => {
        return new HDWalletProvider(
          mnemonic,
          'https://ropsten.infura.io/v3/' + process.env.INFURA_API_KEY
        );
      },
      network_id: '3',
      gas: 4465030,
      gasPrice: 10000000000
    },
    kovan: {
      provider: () => {
        return new HDWalletProvider(
          mnemonic,
          'https://kovan.infura.io/v3/' + process.env.INFURA_API_KEY
        );
      },
      network_id: '42',
      gas: 4465030,
      gasPrice: 10000000000
    },
    rinkeby: {
      provider: () =>
        new HDWalletProvider(
          process.env.MNENOMIC,
          'https://rinkeby.infura.io/v3/' + process.env.INFURA_API_KEY
        ),
      network_id: 4,
      gas: 3000000,
      gasPrice: 10000000000
    },
    // main ethereum network(mainnet)
    main: {
      provider: () =>
        new HDWalletProvider(
          process.env.MNENOMIC,
          'https://mainnet.infura.io/v3/' + process.env.INFURA_API_KEY
        ),
      network_id: 1,
      gas: 3000000,
      gasPrice: 10000000000
    }
  },
  compilers: {
    solc: {
      version: '0.5.10',
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
};

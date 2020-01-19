# Developer Instructions

## `zos` workflow for local development

We use [ZeppelinOS](https://docs.zeppelinos.org/docs/start.html) to develop, deploy and operate the Enable loan kit packages. The [ZeppelinOS Documentation](https://docs.zeppelinos.org/docs/start.html) is a good start.

### Setup

1. Use the proper version of node (see .nvmrc)
2. Run `yarn` to install all zeppelinOS related dependencies
3. Run `ganache-cli` (or `ganache-cli --deterministic`) to run a local blockchain

### Deploy to ganache `development` network

For background: read [Publishing an EVM package](https://docs.zeppelinos.org/docs/publishing.html).

1. `zos publish --network development`. This publishes the project's app, package and provider. This updates the [zos config](https://docs.zeppelinos.org/docs/configuration.html) file with "app.address" field that is needed for tests to run.
2. `zos push --network development`. This deploys the contracts in the project. This has the same effect as running `zos create` on every contract. See [Quickstart](https://docs.zeppelinos.org/docs/first.html) for context.

### Running tests

1. `yarn test`. Also runs `zos push` (Dan: does it upgrade contracts as well?)

### Upgrading contracts

For background: read [Upgrading contracts](https://docs.zeppelinos.org/docs/first.html#upgrading-your-contract)

1. `zos upgrade <contract name>` or `zos upgrade --all` based on contract changed. This should upgrade the contracts.

## Editor setup

We use ESLint and Prettier to format our code. Please make sure you have the following setting turned on in VSCode (or equivalent editor).

```
editor.formatOnSave: true
```
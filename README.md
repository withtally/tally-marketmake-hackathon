# Vote Splitter Contracts

### See the front-end code here:

https://github.com/withtally/tally-mm-hackathon-frontend

Voter Splitter lets owners of on-chain governance tokens temporarily transfer their voting power to someone else.

### How it works:

1. Users can lock governance tokens in a vault and receive that many ERC20 vote tokens. After creation, the user controls the vault and the wrapped tokens.
2. The user can sell the vault, which is an ERC721 NFT. The vault controls the underlying votes on e.g. Compound for a few months.
3. At any time, the owner of the vault can close their position by redeeming enough wrapped tokens to cover the underlying tokens in the vault. They will receive the original governance tokens.
4. Every 50000 blocks – about every 3 months – all outstanding vaults expire. Anyone can close an expired vault by redeeming enough wrapped tokens to cover the underlying tokens in the vault.

## Usage

### Pre Requisites

Before running any command, make sure to install dependencies:

```sh
$ yarn install
```

### Compile

Compile the smart contracts with Hardhat:

```sh
$ yarn compile
```

### TypeChain

Compile the smart contracts and generate TypeChain artifacts:

```sh
$ yarn build
```

### Lint Solidity

Lint the Solidity code:

```sh
$ yarn lint:sol
```

### Lint TypeScript

Lint the TypeScript code:

```sh
$ yarn lint:ts
```

### Test

Run the Mocha tests:

```sh
$ yarn test
```

### Coverage

Generate the code coverage report:

```sh
$ yarn coverage
```

### Clean

Delete the smart contract artifacts, the coverage reports and the Hardhat cache:

```sh
$ yarn clean
```

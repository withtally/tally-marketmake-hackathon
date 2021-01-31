import { ethers, waffle } from "hardhat";
import { Signer } from "@ethersproject/abstract-signer";
import { MockToken } from "../typechain/MockToken";
import { VaultFactory } from "../typechain/VaultFactory";
import { MockGovernorAlpha } from "../typechain/MockGovernorAlpha";

import MockTokenArtifact from "../artifacts/contracts/mocks/mockToken.sol/MockToken.json";
import VaultFactoryArtifact from "../artifacts/contracts/VaultFactory.sol/VaultFactory.json";
import MockGovernorAlphaArtifact from "../artifacts/contracts/mocks/mockGovernorAlpha.sol/MockGovernorAlpha.json";

const { deployContract } = waffle;

async function main(): Promise<void> {
  const metamaskUser = "";

  // Instructions to deploy to Ganache for testing:
  // 1. Run ganache-cli in a seperate terminal window.
  // 2. Copy the mnemonic from ganache-cli into your .env file
  // 3. Connect metamask to network localhost:8545
  // 4. Copy your address in metamask and paste it in line 14 above
  // 5. To run thie script:
  // npx hardhat run ./scripts/testnet_deploy.ts --network localhost
  // A test setup should be deployed, and your metamask user will have
  // tokens and ether. 

  if(!metamaskUser){
    console.error("ERROR: Please hardcode a test metamask account");
    process.exit(1);
  }

  const accounts: Signer[] = await ethers.getSigners();
  const deployer: Signer = accounts[0];

  const mockToken = (await deployContract(deployer, MockTokenArtifact, [])) as MockToken;

  // Send MetaMask user Tokens
  await mockToken.transfer(metamaskUser, ethers.utils.parseEther("1.0"));

  // Send MetaMask User Ether so they can test
  await deployer.sendTransaction({
    to: metamaskUser,
    value: ethers.utils.parseEther("1.0")
  })

  // Deploy Mock Governor Alpha
  const mockGovernor = (await deployContract(deployer, MockGovernorAlphaArtifact, [])) as MockGovernorAlpha;

  // Deploy Vault Factory
  const epochSize = 2;
  const vaultFactory = (await deployContract(deployer, VaultFactoryArtifact, [mockToken.address, mockGovernor.address, epochSize])) as VaultFactory;


  console.log("Vault deployed to: ", vaultFactory.address);
  console.log("MockToken deployed to: ", mockToken.address);
  console.log("MockGovernorAlpha deployed to: ", mockGovernor.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });

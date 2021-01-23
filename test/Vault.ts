import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";

import VaultFactoryArtifact from "../artifacts/contracts/VaultFactory.sol/VaultFactory.json";
import MockTokenArtifact from "../artifacts/contracts/mocks/mockToken.sol/MockToken.json";
import VaultTokenArtifact from "../artifacts/contracts/VaultFactory.sol/VaultToken.json";
import VaultNFTArtifact from "../artifacts/contracts/VaultFactory.sol/VaultNFT.json";

import { Accounts, Signers } from "../types";
import { VaultFactory } from "../typechain/VaultFactory";
import { MockToken } from "../typechain/MockToken";
import { VaultToken } from "../typechain/VaultToken";
import { VaultNFT } from "../typechain/VaultNFT";
import { expect } from "chai";

const { deployContract } = waffle;

describe("Unit tests", function () {
  before(async function () {
    this.accounts = {} as Accounts;
    this.signers = {} as Signers;

    const signers: Signer[] = await ethers.getSigners();
    this.signers.admin = signers[0];
    this.accounts.admin = await signers[0].getAddress();
  });

  describe("VaultFactory", function () {
    let vaultFactory: VaultFactory;
    let sourceToken: MockToken;
    let vaultToken: VaultToken;
    let vaultTokenAddress: string;
    let vaultNFT: VaultNFT;
    let vaultNFTAddress: string;
    beforeEach(async function () {
      sourceToken = (await deployContract(this.signers.admin, MockTokenArtifact, [])) as MockToken;
      vaultFactory = (await deployContract(this.signers.admin, VaultFactoryArtifact, [sourceToken.address])) as VaultFactory;
      vaultTokenAddress = await vaultFactory.vaultToken();
      vaultNFTAddress = await vaultFactory.vaultNFT();
      vaultToken = (new ethers.ContractFactory(VaultTokenArtifact.abi, VaultTokenArtifact.bytecode, this.signers.admin)).attach(vaultTokenAddress) as VaultToken;
      vaultNFT = (new ethers.ContractFactory(VaultNFTArtifact.abi, VaultNFTArtifact.bytecode, this.signers.admin)).attach(vaultNFTAddress) as VaultNFT;
    });

    it("successfully deploys", async function () {
      expect(ethers.utils.isAddress(await vaultFactory.vaultNFT())).to.be.true;
      expect(ethers.utils.isAddress(await vaultFactory.vaultToken())).to.be.true;
    });

    it("Creates vault and emits event", async function (){
      const amount = ethers.utils.parseEther("1");
      await sourceToken.approve(vaultFactory.address, amount);
      await expect(vaultFactory.createVault(amount)).to.emit(vaultFactory, "VaultCreated").withArgs(this.accounts.admin,amount, 1);
    });

    it("Mints tokens on vault creation", async function(){
      const amount = ethers.utils.parseEther("1");
      await sourceToken.approve(vaultFactory.address, amount);
      const balanceBefore = await vaultToken.balanceOf(this.accounts.admin);
      await expect(vaultFactory.createVault(amount)).to.emit(vaultFactory, "VaultCreated").withArgs(this.accounts.admin,amount,1);
      const balanceAfter = await vaultToken.balanceOf(this.accounts.admin);
      expect(balanceAfter.sub(balanceBefore)).to.eq(amount);
    });

    it("Mints nft token on vault creation", async function(){
      const amount = ethers.utils.parseEther("1");
      await sourceToken.approve(vaultFactory.address, amount);
      const balanceBefore = await vaultNFT.balanceOf(this.accounts.admin);
      await expect(vaultFactory.createVault(amount)).to.emit(vaultFactory, "VaultCreated").withArgs(this.accounts.admin,amount,1);
      const balanceAfter = await vaultNFT.balanceOf(this.accounts.admin);
      expect(balanceAfter.sub(balanceBefore)).to.eq(1);
      expect(await vaultNFT.ownerOf(1)).to.eq(this.accounts.admin);
    });
  });
});

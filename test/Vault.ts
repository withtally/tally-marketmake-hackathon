import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";
import { expect } from "chai";

import VaultFactoryArtifact from "../artifacts/contracts/VaultFactory.sol/VaultFactory.json";
import MockTokenArtifact from "../artifacts/contracts/mocks/mockToken.sol/MockToken.json";
import VaultTokenArtifact from "../artifacts/contracts/VaultFactory.sol/VaultToken.json";
import VaultNFTArtifact from "../artifacts/contracts/VaultFactory.sol/VaultNFT.json";
import VaultArtifact from "../artifacts/contracts/VaultFactory.sol/Vault.json";
import MockGovernorAlphaArtifact from "../artifacts/contracts/mocks/mockGovernorAlpha.sol/MockGovernorAlpha.json";

import { Accounts, Signers } from "../types";
import { Vault } from "../typechain/Vault";
import { VaultFactory } from "../typechain/VaultFactory";
import { MockToken } from "../typechain/MockToken";
import { VaultToken } from "../typechain/VaultToken";
import { VaultNFT } from "../typechain/VaultNFT";

import {MockGovernorAlpha} from "../typechain/MockGovernorAlpha";

const { deployContract } = waffle;

describe("Unit tests", function () {
  let userA: Signer;
  before(async function () {
    this.accounts = {} as Accounts;
    this.signers = {} as Signers;

    const signers: Signer[] = await ethers.getSigners();
    this.signers.admin = signers[0];
    this.accounts.admin = await signers[0].getAddress();
    userA = signers[1];
  });

  describe("VaultFactory", function () {
    let vaultFactory: VaultFactory;
    let sourceToken: MockToken;
    let vaultToken: VaultToken;
    let vaultTokenAddress: string;
    let vaultNFT: VaultNFT;
    let vaultNFTAddress: string;
    let vault: Vault;
    let governorAlpha: MockGovernorAlpha;
    const amount = ethers.utils.parseEther("1");
    beforeEach(async function () {
      sourceToken = (await deployContract(this.signers.admin, MockTokenArtifact, [])) as MockToken;
      governorAlpha = (await deployContract(this.signers.admin, MockGovernorAlphaArtifact, [])) as MockGovernorAlpha;
      vaultFactory = (await deployContract(this.signers.admin, VaultFactoryArtifact, [
        sourceToken.address, governorAlpha.address,
      ])) as VaultFactory;
      vaultTokenAddress = await vaultFactory.vaultToken();
      vaultNFTAddress = await vaultFactory.vaultNFT();
      vaultToken = new ethers.ContractFactory(
        VaultTokenArtifact.abi,
        VaultTokenArtifact.bytecode,
        this.signers.admin,
      ).attach(vaultTokenAddress) as VaultToken;
      vaultNFT = new ethers.ContractFactory(VaultNFTArtifact.abi, VaultNFTArtifact.bytecode, this.signers.admin).attach(
        vaultNFTAddress,
      ) as VaultNFT;
    });

    it("successfully deploys", async function () {
      expect(ethers.utils.isAddress(await vaultFactory.vaultNFT())).to.be.true;
      expect(ethers.utils.isAddress(await vaultFactory.vaultToken())).to.be.true;
    });

    it("Creates vault and emits event", async function () {
      await sourceToken.approve(vaultFactory.address, amount);
      await expect(vaultFactory.createVault(amount)).to.emit(vaultFactory, "VaultCreated");
      //.withArgs(this.accounts.admin, amount, 1);
    });

    it("Mints tokens on vault creation", async function () {
      await sourceToken.approve(vaultFactory.address, amount);
      const balanceBefore = await vaultToken.balanceOf(this.accounts.admin);
      await expect(vaultFactory.createVault(amount)).to.emit(vaultFactory, "VaultCreated");
      //.withArgs(this.accounts.admin, amount, 1);
      const balanceAfter = await vaultToken.balanceOf(this.accounts.admin);
      expect(balanceAfter.sub(balanceBefore)).to.eq(amount);
    });

    it("Mints nft token on vault creation", async function () {
      await sourceToken.approve(vaultFactory.address, amount);
      const balanceBefore = await vaultNFT.balanceOf(this.accounts.admin);
      await expect(vaultFactory.createVault(amount)).to.emit(vaultFactory, "VaultCreated");
      //.withArgs(this.accounts.admin, amount, 1);
      const balanceAfter = await vaultNFT.balanceOf(this.accounts.admin);
      expect(balanceAfter.sub(balanceBefore)).to.eq(1);
      expect(await vaultNFT.ownerOf(1)).to.eq(this.accounts.admin);
    });

    it("Creates a new Vault", async function () {
      await sourceToken.approve(vaultFactory.address, amount);
      await expect(vaultFactory.createVault(amount)).to.emit(vaultFactory, "VaultCreated");

      const vaultAddress = await vaultFactory.vaultMapping(1);
      vault = new ethers.ContractFactory(VaultArtifact.abi, VaultArtifact.bytecode, this.signers.admin).attach(
        vaultAddress,
      ) as Vault;
      expect(await sourceToken.balanceOf(vault.address)).to.be.equal(amount);
    });
  });

  describe("Vault", function () {
    let sourceToken: MockToken;
    let vault: Vault;
    let governorAlpha: MockGovernorAlpha;
    let vaultNFTAddress: string;
    let vaultFactory: VaultFactory;
    const amount = 1000;
    beforeEach(async function () {
      governorAlpha = (await deployContract(this.signers.admin, MockGovernorAlphaArtifact, [])) as MockGovernorAlpha;
      sourceToken = (await deployContract(this.signers.admin, MockTokenArtifact, [])) as MockToken;
      vaultFactory = (await deployContract(this.signers.admin, VaultFactoryArtifact, [
        sourceToken.address, governorAlpha.address,
      ])) as VaultFactory;
      vaultNFTAddress = await vaultFactory.vaultNFT();
      vault = (await deployContract(userA, VaultArtifact, [sourceToken.address, governorAlpha.address, vaultNFTAddress,1])) as Vault;
      

      await sourceToken.transfer(vault.address, amount);
    });

    it("newly created Vault receives a balance", async function () {
      const balance = await sourceToken.balanceOf(vault.address);
      expect(balance).to.be.equal(amount);
    });

    it("destroying a Vault returns its balance and refunds gas", async function () {
      const addressA = await userA.getAddress();

      await vault.close(addressA);

      const userBalance = await sourceToken.balanceOf(addressA);
      expect(userBalance).to.be.equal(amount);

      const vaultBalance = await sourceToken.balanceOf(vault.address);
      expect(vaultBalance).to.be.equal(0);
    });

    it("destroying a Vault cleans up the code", async function () {
      const admin = this.signers.admin;
      const EMPTY_CODE = "0x";

      const codeBefore = await admin.provider?.getCode(vault.address);
      expect(codeBefore).to.not.equal(EMPTY_CODE);

      const addressA = await userA.getAddress();
      await vault.close(addressA);

      const codeAfter = await admin.provider?.getCode(vault.address);
      expect(codeAfter).to.equal(EMPTY_CODE);
    });

    it("should delegate votes", async function () {
      const addressA = await userA.getAddress();

      await expect(vault.delegate(addressA)).to.emit(vault, "Delegation").withArgs(vault.address, addressA);

      expect(await sourceToken.delegates(vault.address)).to.be.equal(addressA);
    });

    //it("should cast a vote", async function () {});
  });
});

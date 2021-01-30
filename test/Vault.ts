import { Signer } from "@ethersproject/abstract-signer";
import hre, { ethers, waffle } from "hardhat";
import { expect } from "chai";

import VaultFactoryArtifact from "../artifacts/contracts/VaultFactory.sol/VaultFactory.json";
import MockTokenArtifact from "../artifacts/contracts/mocks/mockToken.sol/MockToken.json";
import VaultTokenArtifact from "../artifacts/contracts/VaultToken.sol/VaultToken.json";
import VaultNFTArtifact from "../artifacts/contracts/VaultNFT.sol/VaultNFT.json";
import VaultArtifact from "../artifacts/contracts/Vault.sol/Vault.json";
import MockGovernorAlphaArtifact from "../artifacts/contracts/mocks/mockGovernorAlpha.sol/MockGovernorAlpha.json";

import { Accounts, Signers } from "../types";
import { Vault } from "../typechain/Vault";
import { VaultFactory } from "../typechain/VaultFactory";
import { MockToken } from "../typechain/MockToken";
import { VaultToken } from "../typechain/VaultToken";
import { VaultNFT } from "../typechain/VaultNFT";

import { MockGovernorAlpha } from "../typechain/MockGovernorAlpha";

const { deployContract } = waffle;

describe("Unit tests", function () {
  let userA: Signer;
  let userB: Signer;
  before(async function () {
    this.accounts = {} as Accounts;
    this.signers = {} as Signers;

    const signers: Signer[] = await ethers.getSigners();
    this.signers.admin = signers[0];
    this.accounts.admin = await signers[0].getAddress();
    userA = signers[1];
    userB = signers[2];
  });

  describe("VaultFactory", function () {
    const epochSize = 4;

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
        sourceToken.address,
        governorAlpha.address,
        epochSize,
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
    });

    it("Mints tokens on vault creation", async function () {
      await sourceToken.approve(vaultFactory.address, amount);
      const balanceBefore = await vaultToken.balanceOf(this.accounts.admin);
      await expect(vaultFactory.createVault(amount)).to.emit(vaultFactory, "VaultCreated");
      const balanceAfter = await vaultToken.balanceOf(this.accounts.admin);
      expect(balanceAfter.sub(balanceBefore)).to.eq(amount);
    });

    it("Mints nft token on vault creation", async function () {
      await sourceToken.approve(vaultFactory.address, amount);
      const balanceBefore = await vaultNFT.balanceOf(this.accounts.admin);
      await expect(vaultFactory.createVault(amount)).to.emit(vaultFactory, "VaultCreated");
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

    it("Owner can close their vault", async function () {
      await sourceToken.approve(vaultFactory.address, amount);
      await vaultFactory.createVault(amount);
      const expectedVaultId = 1;
      const vaultAddress = await vaultFactory.vaultMapping(expectedVaultId);

      await expect(vaultFactory.closeOwnVault(expectedVaultId))
        .to.emit(vaultFactory, "VaultClosedByOwner")
        .withArgs(this.accounts.admin, expectedVaultId, vaultAddress);
    });

    it("Non-owner cannot close an owner's vault", async function () {
      await sourceToken.approve(vaultFactory.address, amount);
      await vaultFactory.createVault(amount);
      const expectedVaultId = 1;
      const vaultFactory2 = vaultFactory.connect(userB);

      await expect(vaultFactory2.closeOwnVault(expectedVaultId)).to.be.revertedWith("Not your stuff");
    });

    it("Cannot close an unexpired vault", async function () {
      await sourceToken.approve(vaultFactory.address, amount);
      await vaultFactory.createVault(amount);
      const expectedVaultId = 1;
      const vaultFactory2 = vaultFactory.connect(userB);

      await expect(vaultFactory2.closeExpiredVault(expectedVaultId)).to.be.revertedWith("Vault not yet expired");
    });

    it("Anyone can close an expired vault", async function () {
      await sourceToken.approve(vaultFactory.address, amount);
      await vaultFactory.createVault(amount);
      const expectedVaultId = 1;
      const vaultAddress = await vaultFactory.vaultMapping(expectedVaultId);
      const vaultFactory2 = vaultFactory.connect(userA);
      for (let i = 0; i < epochSize; i++) {
        await hre.network.provider.send("evm_mine");
      }

      const tGOV = await vaultToken.connect(this.signers.admin);
      await tGOV.transfer(await userA.getAddress(), amount);

      await expect(vaultFactory2.closeExpiredVault(expectedVaultId))
        .to.emit(vaultFactory, "ExpiredVaultClosed")
        .withArgs(await userA.getAddress(), expectedVaultId, vaultAddress);
    });

    it("Need enough tGOV to close an expired vault", async function () {
      await sourceToken.approve(vaultFactory.address, amount);
      await vaultFactory.createVault(amount);
      const expectedVaultId = 1;
      const vaultFactory2 = vaultFactory.connect(userA);
      for (let i = 0; i < epochSize; i++) {
        await hre.network.provider.send("evm_mine");
      }

      const notQuiteEnough = amount.sub(1);
      const tGOV = await vaultToken.connect(this.signers.admin);
      await tGOV.transfer(await userA.getAddress(), notQuiteEnough);

      await expect(vaultFactory2.closeExpiredVault(expectedVaultId)).to.be.revertedWith(
        "Not enough tokens to close vault",
      );
    });
  });

  describe("Vault", function () {
    let sourceToken: MockToken;
    let vault: Vault;
    let governorAlpha: MockGovernorAlpha;
    let vaultNFT: VaultNFT;
    const amount = 1000;
    beforeEach(async function () {
      governorAlpha = (await deployContract(this.signers.admin, MockGovernorAlphaArtifact, [])) as MockGovernorAlpha;
      sourceToken = (await deployContract(this.signers.admin, MockTokenArtifact, [])) as MockToken;

      vaultNFT = (await deployContract(this.signers.admin, VaultNFTArtifact, [this.accounts.admin])) as VaultNFT;
      vault = (await deployContract(userA, VaultArtifact, [
        sourceToken.address,
        governorAlpha.address,
        vaultNFT.address,
        1,
      ])) as Vault;
      await vaultNFT.mint(await userA.getAddress());
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

    it("should delegate votes", async function () {
      const addressB = await userB.getAddress();
      await expect(vault.delegate(addressB)).to.emit(vault, "Delegation").withArgs(vault.address, addressB);

      expect(await sourceToken.delegates(vault.address)).to.be.equal(addressB);
    });

    //it("should cast a vote", async function () {});
  });
});

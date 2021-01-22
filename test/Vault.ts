import { Signer } from "@ethersproject/abstract-signer";
import { ethers, waffle } from "hardhat";

import VaultFactoryArtifact from "../artifacts/contracts/VaultFactory.sol/VaultFactory.json";

import { Accounts, Signers } from "../types";
import { VaultFactory } from "../typechain/VaultFactory";
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
    beforeEach(async function () {
      vaultFactory = (await deployContract(this.signers.admin, VaultFactoryArtifact, [])) as VaultFactory;
    });

    it("successfully deploys", async function () {
      expect(ethers.utils.isAddress(await vaultFactory.vaultNFT())).to.be.true;
      expect(ethers.utils.isAddress(await vaultFactory.vaultToken())).to.be.true;
    });
  });
});

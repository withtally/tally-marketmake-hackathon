pragma solidity ^0.7.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Compound Token Interface
interface ICompoundERC20 is IERC20 {
  function delegate(address delegatee) external;
}

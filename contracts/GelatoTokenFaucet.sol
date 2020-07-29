// "SPDX-License-Identifier: UNLICENSED"
pragma solidity ^0.6.10;

import {SafeERC20} from "@gelatonetwork/core/contracts/external/SafeERC20.sol";
import {IERC20} from "@gelatonetwork/core/contracts/external/IERC20.sol";

interface IDecimalERC20 {
    function decimals() external view returns(uint8);
}

contract GelatoTokenFaucet {

    mapping(address => uint256) lastMintingTime;
    using SafeERC20 for IERC20;


    function mint(address _token) public {
        // Users can only mint once per day
        require(lastMintingTime[msg.sender] < block.timestamp - 24 hours, "Daily allowance depleted");

        IERC20 token = IERC20(_token);
        uint256 mintAmount = 50 * 10 ** uint256(IDecimalERC20(_token).decimals());

        // Faucet requires sufficient balance
        require(token.balanceOf(address(this)) > mintAmount, "Faucet is depleted");

        // Effect
        lastMintingTime[msg.sender] = block.timestamp;

        // Transfer 50 tokens to user
        token.transfer(msg.sender, mintAmount);

    }

}
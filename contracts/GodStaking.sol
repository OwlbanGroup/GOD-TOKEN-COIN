// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GodStaking
 * @dev Staking contract for GOD tokens with precious metal rewards
 */
contract GodStaking is ReentrancyGuard, Ownable {
    IERC20 public godToken;

    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
        bool active;
    }

    mapping(address => Stake) public stakes;
    mapping(address => uint256) public rewards;

    // Staking parameters
    uint256 public constant REWARD_RATE = 10; // 10% APY base rate
    uint256 public constant LOCK_PERIOD = 30 days;
    uint256 public totalStaked;

    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);

    constructor(address _godToken) {
        godToken = IERC20(_godToken);
    }

    /**
     * @dev Stake GOD tokens
     */
    function stake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Cannot stake 0 tokens");
        require(godToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");

        Stake storage userStake = stakes[msg.sender];

        if (userStake.active) {
            // Claim existing rewards before restaking
            _claimRewards(msg.sender);
            userStake.amount += _amount;
        } else {
            userStake.amount = _amount;
            userStake.startTime = block.timestamp;
            userStake.lastClaimTime = block.timestamp;
            userStake.active = true;
        }

        totalStaked += _amount;
        emit Staked(msg.sender, _amount);
    }

    /**
     * @dev Unstake GOD tokens (after lock period)
     */
    function unstake() external nonReentrant {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.active, "No active stake");
        require(block.timestamp >= userStake.startTime + LOCK_PERIOD, "Lock period not ended");

        uint256 amount = userStake.amount;

        // Claim final rewards
        _claimRewards(msg.sender);

        // Reset stake
        userStake.active = false;
        userStake.amount = 0;
        totalStaked -= amount;

        require(godToken.transfer(msg.sender, amount), "Transfer failed");
        emit Unstaked(msg.sender, amount);
    }

    /**
     * @dev Claim staking rewards
     */
    function claimRewards() external nonReentrant {
        _claimRewards(msg.sender);
    }

    /**
     * @dev Internal function to calculate and claim rewards
     */
    function _claimRewards(address _user) internal {
        Stake storage userStake = stakes[_user];
        if (!userStake.active) return;

        uint256 reward = calculateRewards(_user);
        if (reward > 0) {
            userStake.lastClaimTime = block.timestamp;
            rewards[_user] = 0;
            // In reality, mint new tokens or transfer from reward pool
            require(godToken.transfer(_user, reward), "Reward transfer failed");
            emit RewardClaimed(_user, reward);
        }
    }

    /**
     * @dev Calculate pending rewards for a user
     */
    function calculateRewards(address _user) public view returns (uint256) {
        Stake memory userStake = stakes[_user];
        if (!userStake.active) return 0;

        uint256 timeElapsed = block.timestamp - userStake.lastClaimTime;
        uint256 reward = (userStake.amount * REWARD_RATE * timeElapsed) / (365 days * 100);

        return reward;
    }

    /**
     * @dev Get stake information
     */
    function getStakeInfo(address _user) external view returns (
        uint256 amount,
        uint256 startTime,
        uint256 lastClaimTime,
        uint256 pendingRewards,
        bool active
    ) {
        Stake memory userStake = stakes[_user];
        uint256 pending = calculateRewards(_user);

        return (
            userStake.amount,
            userStake.startTime,
            userStake.lastClaimTime,
            pending,
            userStake.active
        );
    }
}

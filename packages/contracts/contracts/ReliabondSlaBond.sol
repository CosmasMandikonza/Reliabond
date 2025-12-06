// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ReliabondSlaBond
 * @notice SLA Bond contract for the Reliabond Agent Reliability Exchange
 * @dev Service operators deposit bonds that can be slashed by authorized agents
 *      when SLA breaches are detected.
 * 
 * Built for Nullshot Hacks Season 0 - Track 1a
 */
contract ReliabondSlaBond is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice The token used for bonds (e.g., USDC, WETH, or test token)
    IERC20 public immutable bondToken;

    /// @notice The service operator who owns this bond
    address public serviceOperator;

    /// @notice Current bond balance
    uint256 public bondBalance;

    /// @notice Authorized agent executor address that can trigger payouts
    address public agentExecutor;

    /// @notice Mapping of covered user addresses
    mapping(address => bool) public coveredUsers;
    address[] public coveredUserList;

    /// @notice Processed incidents (to prevent double payouts)
    mapping(bytes32 => bool) public processedIncidents;

    /// @notice Maximum payout percentage per incident (in basis points, e.g., 1000 = 10%)
    uint256 public constant MAX_PAYOUT_BPS = 1000; // 10%

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    event BondDeposited(address indexed operator, uint256 amount, uint256 newBalance);
    event BondWithdrawn(address indexed operator, uint256 amount, uint256 newBalance);
    event UserCovered(address indexed user);
    event UserRemoved(address indexed user);
    event AgentExecutorUpdated(address indexed oldExecutor, address indexed newExecutor);
    
    event IncidentPayout(
        bytes32 indexed incidentId,
        uint256 totalPayout,
        uint256 perUserPayout,
        uint256 userCount,
        uint256 newBondBalance
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    error NotServiceOperator();
    error NotAgentExecutor();
    error IncidentAlreadyProcessed();
    error PayoutExceedsMaximum();
    error InsufficientBondBalance();
    error NoUsers();
    error ZeroAddress();

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initialize the SLA bond contract
     * @param _bondToken Address of the ERC20 token for bonds
     * @param _serviceOperator Address of the service operator
     * @param _agentExecutor Address authorized to trigger payouts
     */
    constructor(
        address _bondToken,
        address _serviceOperator,
        address _agentExecutor
    ) Ownable(msg.sender) {
        if (_bondToken == address(0)) revert ZeroAddress();
        if (_serviceOperator == address(0)) revert ZeroAddress();
        if (_agentExecutor == address(0)) revert ZeroAddress();

        bondToken = IERC20(_bondToken);
        serviceOperator = _serviceOperator;
        agentExecutor = _agentExecutor;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════

    modifier onlyServiceOperator() {
        if (msg.sender != serviceOperator) revert NotServiceOperator();
        _;
    }

    modifier onlyAgentExecutor() {
        if (msg.sender != agentExecutor) revert NotAgentExecutor();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BOND MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Deposit tokens into the bond
     * @param amount Amount to deposit
     */
    function deposit(uint256 amount) external onlyServiceOperator nonReentrant {
        bondToken.safeTransferFrom(msg.sender, address(this), amount);
        bondBalance += amount;
        
        emit BondDeposited(msg.sender, amount, bondBalance);
    }

    /**
     * @notice Withdraw tokens from the bond (operator only)
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external onlyServiceOperator nonReentrant {
        if (amount > bondBalance) revert InsufficientBondBalance();
        
        bondBalance -= amount;
        bondToken.safeTransfer(msg.sender, amount);
        
        emit BondWithdrawn(msg.sender, amount, bondBalance);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // USER MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Add a user to coverage
     * @param user Address to cover
     */
    function addCoveredUser(address user) external onlyServiceOperator {
        if (user == address(0)) revert ZeroAddress();
        if (!coveredUsers[user]) {
            coveredUsers[user] = true;
            coveredUserList.push(user);
            emit UserCovered(user);
        }
    }

    /**
     * @notice Add multiple users to coverage
     * @param users Array of addresses to cover
     */
    function addCoveredUsers(address[] calldata users) external onlyServiceOperator {
        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            if (user != address(0) && !coveredUsers[user]) {
                coveredUsers[user] = true;
                coveredUserList.push(user);
                emit UserCovered(user);
            }
        }
    }

    /**
     * @notice Get count of covered users
     */
    function getCoveredUserCount() external view returns (uint256) {
        return coveredUserList.length;
    }

    /**
     * @notice Get all covered users
     */
    function getCoveredUsers() external view returns (address[] memory) {
        return coveredUserList;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PAYOUT (Called by Agent)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Execute an incident payout to covered users
     * @dev Only callable by the authorized agent executor
     * @param incidentId Unique identifier for this incident (prevents double payouts)
     * @param users Array of user addresses to pay (must be subset of covered users)
     * @param amountPerUser Amount to pay each user
     */
    function payoutIncident(
        bytes32 incidentId,
        address[] calldata users,
        uint256 amountPerUser
    ) external onlyAgentExecutor nonReentrant {
        // Prevent double processing
        if (processedIncidents[incidentId]) revert IncidentAlreadyProcessed();
        
        // Validate users
        if (users.length == 0) revert NoUsers();
        
        // Calculate total payout
        uint256 totalPayout = amountPerUser * users.length;
        
        // Check max payout limit (10% of bond)
        uint256 maxPayout = (bondBalance * MAX_PAYOUT_BPS) / 10000;
        if (totalPayout > maxPayout) revert PayoutExceedsMaximum();
        
        // Check sufficient balance
        if (totalPayout > bondBalance) revert InsufficientBondBalance();

        // Mark incident as processed
        processedIncidents[incidentId] = true;

        // Deduct from bond
        bondBalance -= totalPayout;

        // Pay each user
        for (uint256 i = 0; i < users.length; i++) {
            // Only pay covered users
            if (coveredUsers[users[i]]) {
                bondToken.safeTransfer(users[i], amountPerUser);
            }
        }

        emit IncidentPayout(
            incidentId,
            totalPayout,
            amountPerUser,
            users.length,
            bondBalance
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Update the agent executor address
     * @param newExecutor New executor address
     */
    function setAgentExecutor(address newExecutor) external onlyOwner {
        if (newExecutor == address(0)) revert ZeroAddress();
        
        address old = agentExecutor;
        agentExecutor = newExecutor;
        
        emit AgentExecutorUpdated(old, newExecutor);
    }

    /**
     * @notice Transfer service operator role
     * @param newOperator New operator address
     */
    function transferServiceOperator(address newOperator) external onlyServiceOperator {
        if (newOperator == address(0)) revert ZeroAddress();
        serviceOperator = newOperator;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Check if an incident has been processed
     */
    function isIncidentProcessed(bytes32 incidentId) external view returns (bool) {
        return processedIncidents[incidentId];
    }

    /**
     * @notice Get current bond details
     */
    function getBondDetails() external view returns (
        address token,
        address operator,
        address executor,
        uint256 balance,
        uint256 userCount
    ) {
        return (
            address(bondToken),
            serviceOperator,
            agentExecutor,
            bondBalance,
            coveredUserList.length
        );
    }
}

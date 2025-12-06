// ===========================================
// RELIABOND CONTRACT DEPLOYMENT SCRIPT
// ===========================================
// 
// This script deploys the ReliabondSlaBond contract to Base Sepolia testnet
// using the Thirdweb SDK.
//
// PREREQUISITES:
// 1. Create a Thirdweb account and get a secret key from https://thirdweb.com/dashboard
// 2. Generate or use an existing wallet for the agent executor
// 3. Get some Base Sepolia ETH from a faucet
//
// ENVIRONMENT VARIABLES (required):
// - AGENT_EXECUTOR_PRIVATE_KEY: Private key of the wallet that will execute payouts
// - THIRDWEB_SECRET_KEY: Your Thirdweb API secret key
// - THIRDWEB_CLIENT_ID: (optional) Your Thirdweb client ID
//
// ENVIRONMENT VARIABLES (optional):
// - TEST_ERC20_ADDRESS: Address of the ERC20 token for bonds (defaults to USDC on Base Sepolia)
// - SERVICE_OPERATOR_ADDRESS: Address of the service operator (defaults to deployer)
//
// USAGE:
//   cd packages/contracts
//   pnpm deploy:testnet
//
// After deployment, add the contract address to your .env:
//   SLA_BOND_CONTRACT_ADDRESS=0x...

import { ThirdwebSDK } from '@thirdweb-dev/sdk';
import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '../../../.env') });
config(); // Also check local .env

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CHAIN = 'base-sepolia'; // Base Sepolia testnet (chainId: 84532)
const PRIVATE_KEY = process.env.AGENT_EXECUTOR_PRIVATE_KEY;
const THIRDWEB_SECRET_KEY = process.env.THIRDWEB_SECRET_KEY;
const THIRDWEB_CLIENT_ID = process.env.THIRDWEB_CLIENT_ID;

// Known token addresses on Base Sepolia
const KNOWN_TOKENS = {
  // USDC on Base Sepolia (Circle)
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  // WETH on Base Sepolia
  WETH: '0x4200000000000000000000000000000000000006',
};

// Demo addresses derived from Hardhat/Anvil default accounts
const DEMO_ADDRESSES = {
  // Default Hardhat account #0
  operator: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  // Demo covered users (Hardhat accounts #5-7)
  users: [
    '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
    '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
    '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DEPLOYMENT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                     RELIABOND CONTRACT DEPLOYMENT                         ║
║                                                                           ║
║  Target: Base Sepolia Testnet                                             ║
║  Contract: ReliabondSlaBond                                               ║
╚═══════════════════════════════════════════════════════════════════════════╝
  `);

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  if (!PRIVATE_KEY) {
    console.error('❌ ERROR: AGENT_EXECUTOR_PRIVATE_KEY is not set');
    console.error('');
    console.error('   This is the private key of the wallet that will:');
    console.error('   1. Deploy the contract');
    console.error('   2. Execute payout transactions when breaches occur');
    console.error('');
    console.error('   Generate one with:');
    console.error('     cast wallet new');
    console.error('');
    console.error('   Then fund it with Base Sepolia ETH from:');
    console.error('     https://www.coinbase.com/faucets/base-ethereum-goerli-faucet');
    process.exit(1);
  }

  if (!THIRDWEB_SECRET_KEY) {
    console.error('❌ ERROR: THIRDWEB_SECRET_KEY is not set');
    console.error('');
    console.error('   Get your API key from:');
    console.error('     https://thirdweb.com/dashboard/settings/api-keys');
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SDK INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  console.log('📦 Initializing Thirdweb SDK...\n');
  
  const sdkOptions: { secretKey: string; clientId?: string } = {
    secretKey: THIRDWEB_SECRET_KEY,
  };
  if (THIRDWEB_CLIENT_ID) {
    sdkOptions.clientId = THIRDWEB_CLIENT_ID;
  }

  const sdk = ThirdwebSDK.fromPrivateKey(PRIVATE_KEY, CHAIN, sdkOptions);

  const deployer = await sdk.wallet.getAddress();
  const balance = await sdk.wallet.balance();

  console.log('   Configuration:');
  console.log('   ─────────────────────────────────────────────────────────');
  console.log(`   Chain:         ${CHAIN}`);
  console.log(`   Deployer:      ${deployer}`);
  console.log(`   Balance:       ${balance.displayValue} ${balance.symbol}`);
  console.log('');

  if (parseFloat(balance.displayValue) < 0.001) {
    console.error('❌ ERROR: Insufficient balance for deployment');
    console.error('   Please fund the deployer address with Base Sepolia ETH');
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEPLOYMENT CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────

  const deployConfig = {
    bondTokenAddress: process.env.TEST_ERC20_ADDRESS || KNOWN_TOKENS.USDC,
    serviceOperator: process.env.SERVICE_OPERATOR_ADDRESS || deployer, // Default to deployer
    agentExecutor: deployer, // The deployer is also the agent executor
  };

  console.log('   Deployment Parameters:');
  console.log('   ─────────────────────────────────────────────────────────');
  console.log(`   Bond Token:        ${deployConfig.bondTokenAddress}`);
  console.log(`   Service Operator:  ${deployConfig.serviceOperator}`);
  console.log(`   Agent Executor:    ${deployConfig.agentExecutor}`);
  console.log('');

  // ─────────────────────────────────────────────────────────────────────────
  // CONTRACT DEPLOYMENT
  // ─────────────────────────────────────────────────────────────────────────

  console.log('🚀 Deploying ReliabondSlaBond contract...\n');

  try {
    // Option 1: Deploy from compiled ABI (recommended for hackathon)
    const abiPath = join(__dirname, '../artifacts/ReliabondSlaBond.json');
    let contractAddress: string;

    if (existsSync(abiPath)) {
      // Deploy from local ABI
      console.log('   Using locally compiled contract...');
      const artifact = JSON.parse(readFileSync(abiPath, 'utf8'));
      
      contractAddress = await sdk.deployer.deployContractWithAbi(
        artifact.abi,
        artifact.bytecode,
        [
          deployConfig.bondTokenAddress,
          deployConfig.serviceOperator,
          deployConfig.agentExecutor,
        ]
      );
    } else {
      // Option 2: Deploy from published contract URI
      // For hackathon, you would publish the contract to Thirdweb first
      console.log('   ⚠️  No local ABI found. Attempting to deploy from Thirdweb registry...');
      console.log('');
      console.log('   To compile the contract locally:');
      console.log('     cd packages/contracts');
      console.log('     forge build --out artifacts');
      console.log('');
      
      // This would be your published contract URI after running `thirdweb publish`
      const PUBLISHED_CONTRACT_URI = process.env.THIRDWEB_CONTRACT_URI;
      
      if (!PUBLISHED_CONTRACT_URI) {
        console.error('❌ ERROR: Neither local ABI nor THIRDWEB_CONTRACT_URI available');
        console.error('');
        console.error('   Option 1: Compile locally with Foundry:');
        console.error('     forge build --out artifacts');
        console.error('');
        console.error('   Option 2: Publish to Thirdweb and set THIRDWEB_CONTRACT_URI');
        process.exit(1);
      }

      contractAddress = await sdk.deployer.deployContractFromUri(
        PUBLISHED_CONTRACT_URI,
        [
          deployConfig.bondTokenAddress,
          deployConfig.serviceOperator,
          deployConfig.agentExecutor,
        ]
      );
    }

    console.log('');
    console.log('✅ Contract deployed successfully!');
    console.log('');
    console.log('   Contract Address:');
    console.log(`   ${contractAddress}`);
    console.log('');
    console.log('   BaseScan Explorer:');
    console.log(`   https://sepolia.basescan.org/address/${contractAddress}`);
    console.log('');

    // ─────────────────────────────────────────────────────────────────────────
    // POST-DEPLOYMENT SETUP (Optional)
    // ─────────────────────────────────────────────────────────────────────────

    console.log('📝 Setting up demo covered users...\n');

    const contract = await sdk.getContract(contractAddress);

    try {
      await contract.call('addCoveredUsers', [DEMO_ADDRESSES.users]);
      console.log(`   ✅ Added ${DEMO_ADDRESSES.users.length} demo covered users`);
      DEMO_ADDRESSES.users.forEach((user, i) => {
        console.log(`      ${i + 1}. ${user}`);
      });
    } catch (error) {
      console.log('   ⚠️  Could not add covered users (may not exist in contract)');
      console.log('      This is fine for demo purposes');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OUTPUT INSTRUCTIONS
    // ─────────────────────────────────────────────────────────────────────────

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('                    DEPLOYMENT COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('Add this to your .env file:');
    console.log('');
    console.log(`SLA_BOND_CONTRACT_ADDRESS=${contractAddress}`);
    console.log('');
    console.log('To use this contract:');
    console.log('');
    console.log('1. Update .env with the contract address above');
    console.log('2. Start the MCP server: cd packages/mcp-reliabond && pnpm dev');
    console.log('3. Start the agents: pnpm probe && pnpm reliability');
    console.log('4. Watch for breaches and payouts!');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Deployment failed');
    console.error('');
    if (error instanceof Error) {
      console.error('   Error:', error.message);
      if (error.message.includes('insufficient funds')) {
        console.error('');
        console.error('   Your deployer wallet needs more ETH.');
        console.error('   Get some from: https://www.coinbase.com/faucets');
      }
    } else {
      console.error('   Error:', error);
    }
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ALTERNATIVE: Manual ABI Deployment (for local development)
// ═══════════════════════════════════════════════════════════════════════════

async function deployWithAbi(): Promise<string> {
  if (!PRIVATE_KEY || !THIRDWEB_SECRET_KEY) {
    throw new Error('Missing required environment variables');
  }

  const sdk = ThirdwebSDK.fromPrivateKey(PRIVATE_KEY, CHAIN, {
    secretKey: THIRDWEB_SECRET_KEY,
  });

  const abiPath = join(__dirname, '../artifacts/ReliabondSlaBond.json');
  
  if (!existsSync(abiPath)) {
    throw new Error(`ABI file not found at ${abiPath}. Run 'forge build' first.`);
  }

  const artifact = JSON.parse(readFileSync(abiPath, 'utf8'));
  const deployer = await sdk.wallet.getAddress();

  const contractAddress = await sdk.deployer.deployContractWithAbi(
    artifact.abi,
    artifact.bytecode,
    [
      KNOWN_TOKENS.USDC,  // bondToken
      deployer,           // serviceOperator
      deployer,           // agentExecutor
    ]
  );

  return contractAddress;
}

// Export for programmatic use
export { deployWithAbi, KNOWN_TOKENS, DEMO_ADDRESSES };

// Run main
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

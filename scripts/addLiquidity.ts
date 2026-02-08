/**
 * Add Liquidity Script for DynamicSwap
 * 
 * Usage:
 *   npx tsx scripts/addLiquidity.ts --network base --amount0 0.01 --amount1 25
 *   npx tsx scripts/addLiquidity.ts --network celo --amount0 10 --amount1 5
 * 
 * Environment variables required:
 *   PRIVATE_KEY - Your wallet private key
 */

import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  parseUnits, 
  formatUnits,
  maxUint256,
  encodeAbiParameters,
  parseAbiParameters
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, celo } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

// Contract addresses
const CONTRACTS = {
  base: {
    poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b' as `0x${string}`,
    positionManager: '0x7c5f5a4bbd8fd63184577525326123b519429bdc' as `0x${string}`,
    hook: '0x2c80c5cd9fecc3e32dfaa654e022738480a4909a' as `0x${string}`,
    // Tokens
    WETH: '0x4200000000000000000000000000000000000006' as `0x${string}`,
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  },
  celo: {
    poolManager: '0x288dc841A52FCA2707c6947B3A777c5E56cd87BC' as `0x${string}`,
    positionManager: '0xf7965f3981e4d5bc383bfbcb61501763e9068ca9' as `0x${string}`,
    hook: '0xe96B2C7416596fE707ba40379B909F42F18d7FC0' as `0x${string}`,
    // Tokens
    CELO: '0x471EcE3750Da237f93B8E339c536989b8978a438' as `0x${string}`,
    cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a' as `0x${string}`,
  },
};

// Token decimals
const DECIMALS = {
  WETH: 18,
  USDC: 6,
  CELO: 18,
  cUSD: 18,
};

// ERC20 ABI (minimal)
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  }
] as const;

// Dynamic fee flag
const DYNAMIC_FEE_FLAG = 0x800000;

// Sort tokens
function sortTokens(tokenA: string, tokenB: string): [string, string] {
  return tokenA.toLowerCase() < tokenB.toLowerCase() 
    ? [tokenA, tokenB] 
    : [tokenB, tokenA];
}

// Get full range ticks
function getFullRangeTicks(tickSpacing: number): [number, number] {
  const MIN_TICK = -887272;
  const MAX_TICK = 887272;
  const minTick = Math.ceil(MIN_TICK / tickSpacing) * tickSpacing;
  const maxTick = Math.floor(MAX_TICK / tickSpacing) * tickSpacing;
  return [minTick, maxTick];
}

// Parse command line args
function parseArgs() {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace('--', '');
      const value = args[i + 1] || '';
      result[key] = value;
      i++;
    }
  }
  
  return result;
}

async function main() {
  const args = parseArgs();
  const network = args.network || 'base';
  const amount0Input = args.amount0 || '0.01';
  const amount1Input = args.amount1 || '25';

  if (network !== 'base' && network !== 'celo') {
    console.error('Invalid network. Use --network base or --network celo');
    process.exit(1);
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('PRIVATE_KEY environment variable is required');
    console.log('\nCreate a .env file with:');
    console.log('PRIVATE_KEY=0x...');
    process.exit(1);
  }

  // Setup
  const chain = network === 'base' ? base : celo;
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  console.log('\n💧 DynamicSwap Add Liquidity Script');
  console.log('====================================');
  console.log(`Network: ${network}`);
  console.log(`Wallet: ${account.address}`);
  console.log(`Position Manager: ${CONTRACTS[network].positionManager}`);

  // Define tokens and amounts based on network
  let token0Addr: string, token1Addr: string;
  let token0Symbol: string, token1Symbol: string;
  let decimals0: number, decimals1: number;
  let amount0: bigint, amount1: bigint;

  if (network === 'base') {
    const contracts = CONTRACTS['base'];
    [token0Addr, token1Addr] = sortTokens(contracts.WETH, contracts.USDC);
    const isUSDCFirst = contracts.USDC.toLowerCase() < contracts.WETH.toLowerCase();
    
    if (isUSDCFirst) {
      token0Symbol = 'USDC';
      token1Symbol = 'WETH';
      decimals0 = DECIMALS.USDC;
      decimals1 = DECIMALS.WETH;
      amount0 = parseUnits(amount1Input, decimals0); // USDC amount
      amount1 = parseUnits(amount0Input, decimals1); // WETH amount
    } else {
      token0Symbol = 'WETH';
      token1Symbol = 'USDC';
      decimals0 = DECIMALS.WETH;
      decimals1 = DECIMALS.USDC;
      amount0 = parseUnits(amount0Input, decimals0); // WETH amount
      amount1 = parseUnits(amount1Input, decimals1); // USDC amount
    }
  } else {
    const contracts = CONTRACTS['celo'];
    [token0Addr, token1Addr] = sortTokens(contracts.CELO, contracts.cUSD);
    const isCUSDFirst = contracts.cUSD.toLowerCase() < contracts.CELO.toLowerCase();
    
    if (isCUSDFirst) {
      token0Symbol = 'cUSD';
      token1Symbol = 'CELO';
      decimals0 = DECIMALS.cUSD;
      decimals1 = DECIMALS.CELO;
      amount0 = parseUnits(amount1Input, decimals0);
      amount1 = parseUnits(amount0Input, decimals1);
    } else {
      token0Symbol = 'CELO';
      token1Symbol = 'cUSD';
      decimals0 = DECIMALS.CELO;
      decimals1 = DECIMALS.cUSD;
      amount0 = parseUnits(amount0Input, decimals0);
      amount1 = parseUnits(amount1Input, decimals1);
    }
  }

  console.log(`\nToken0 (${token0Symbol}): ${token0Addr}`);
  console.log(`Token1 (${token1Symbol}): ${token1Addr}`);
  console.log(`Amount0: ${formatUnits(amount0, decimals0)} ${token0Symbol}`);
  console.log(`Amount1: ${formatUnits(amount1, decimals1)} ${token1Symbol}`);

  // Check balances
  console.log('\nChecking balances...');
  const balance0 = await publicClient.readContract({
    address: token0Addr as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });
  const balance1 = await publicClient.readContract({
    address: token1Addr as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });

  console.log(`${token0Symbol} balance: ${formatUnits(balance0 as bigint, decimals0)}`);
  console.log(`${token1Symbol} balance: ${formatUnits(balance1 as bigint, decimals1)}`);

  if ((balance0 as bigint) < amount0) {
    console.error(`\n❌ Insufficient ${token0Symbol} balance`);
    process.exit(1);
  }
  if ((balance1 as bigint) < amount1) {
    console.error(`\n❌ Insufficient ${token1Symbol} balance`);
    process.exit(1);
  }

  // Check and set approvals
  console.log('\nChecking approvals...');
  
  const allowance0 = await publicClient.readContract({
    address: token0Addr as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, CONTRACTS[network].positionManager],
  });

  if ((allowance0 as bigint) < amount0) {
    console.log(`Approving ${token0Symbol}...`);
    const approveHash = await walletClient.writeContract({
      address: token0Addr as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS[network].positionManager, maxUint256],
    });
    console.log(`Approval tx: ${approveHash}`);
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log(`${token0Symbol} approved ✓`);
  } else {
    console.log(`${token0Symbol} already approved ✓`);
  }

  const allowance1 = await publicClient.readContract({
    address: token1Addr as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, CONTRACTS[network].positionManager],
  });

  if ((allowance1 as bigint) < amount1) {
    console.log(`Approving ${token1Symbol}...`);
    const approveHash = await walletClient.writeContract({
      address: token1Addr as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACTS[network].positionManager, maxUint256],
    });
    console.log(`Approval tx: ${approveHash}`);
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log(`${token1Symbol} approved ✓`);
  } else {
    console.log(`${token1Symbol} already approved ✓`);
  }

  // Pool key
  const poolKey = {
    currency0: token0Addr as `0x${string}`,
    currency1: token1Addr as `0x${string}`,
    fee: DYNAMIC_FEE_FLAG,
    tickSpacing: 60,
    hooks: CONTRACTS[network].hook,
  };

  // Get tick range
  const [tickLower, tickUpper] = getFullRangeTicks(60);
  console.log(`\nTick range: [${tickLower}, ${tickUpper}] (full range)`);

  // NOTE: The actual add liquidity call depends on the specific PositionManager implementation
  // This is a placeholder showing the structure - actual encoding may vary
  console.log('\n⚠️  Note: Adding liquidity requires specific encoding for the PositionManager.');
  console.log('The exact calldata structure depends on the V4 PositionManager version.');
  console.log('\nFor production use, please:');
  console.log('1. Use the web interface, or');
  console.log('2. Refer to Uniswap V4 documentation for correct encoding');
  
  console.log('\n📋 Pool Key (for manual interaction):');
  console.log(JSON.stringify({
    currency0: poolKey.currency0,
    currency1: poolKey.currency1,
    fee: poolKey.fee,
    tickSpacing: poolKey.tickSpacing,
    hooks: poolKey.hooks,
  }, null, 2));
}

main().catch(console.error);

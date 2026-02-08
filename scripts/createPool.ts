/**
 * Pool Creation Script for DynamicSwap
 * 
 * Usage:
 *   npx tsx scripts/createPool.ts --network base
 *   npx tsx scripts/createPool.ts --network celo
 * 
 * Environment variables required:
 *   PRIVATE_KEY - Your wallet private key
 */

import { createPublicClient, createWalletClient, http, parseUnits, encodeAbiParameters, parseAbiParameters } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, celo } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

// Contract addresses
const CONTRACTS = {
  base: {
    poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b' as `0x${string}`,
    hook: '0x2c80c5cd9fecc3e32dfaa654e022738480a4909a' as `0x${string}`,
    // Tokens
    WETH: '0x4200000000000000000000000000000000000006' as `0x${string}`,
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  },
  celo: {
    poolManager: '0x288dc841A52FCA2707c6947B3A777c5E56cd87BC' as `0x${string}`,
    hook: '0xe96B2C7416596fE707ba40379B909F42F18d7FC0' as `0x${string}`,
    // Tokens
    CELO: '0x471EcE3750Da237f93B8E339c536989b8978a438' as `0x${string}`,
    cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a' as `0x${string}`,
  },
};

// Pool Manager ABI (minimal)
const POOL_MANAGER_ABI = [
  {
    name: 'initialize',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' }
        ]
      },
      { name: 'sqrtPriceX96', type: 'uint160' }
    ],
    outputs: [{ name: 'tick', type: 'int24' }]
  }
] as const;

// Dynamic fee flag
const DYNAMIC_FEE_FLAG = 0x800000;

// Sort tokens (currency0 must be < currency1)
function sortTokens(tokenA: string, tokenB: string): [string, string] {
  return tokenA.toLowerCase() < tokenB.toLowerCase() 
    ? [tokenA, tokenB] 
    : [tokenB, tokenA];
}

// Convert price to sqrtPriceX96
function priceToSqrtPriceX96(price: number): bigint {
  const sqrtPrice = Math.sqrt(price);
  const sqrtPriceX96 = sqrtPrice * 2 ** 96;
  return BigInt(Math.floor(sqrtPriceX96));
}

async function main() {
  // Parse args
  const args = process.argv.slice(2);
  const networkArg = args.find(arg => arg.startsWith('--network=')) || args[args.indexOf('--network') + 1];
  const network = networkArg?.replace('--network=', '') || 'base';

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
  const contracts = CONTRACTS[network];
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

  console.log('\n🚀 DynamicSwap Pool Creation Script');
  console.log('===================================');
  console.log(`Network: ${network}`);
  console.log(`Wallet: ${account.address}`);
  console.log(`Hook: ${contracts.hook}`);

  // Define pool parameters
  let token0: string, token1: string, initialPrice: number;

  if (network === 'base') {
    // WETH/USDC pool
    [token0, token1] = sortTokens(contracts.WETH, contracts.USDC);
    // Initial price: 1 WETH = 2500 USDC
    // If USDC < WETH, price is WETH/USDC = 2500
    // If WETH < USDC, price is USDC/WETH = 0.0004
    initialPrice = contracts.USDC.toLowerCase() < contracts.WETH.toLowerCase() ? 2500 : 0.0004;
    console.log(`\nCreating WETH/USDC pool`);
  } else {
    // CELO/cUSD pool
    [token0, token1] = sortTokens(contracts.CELO, contracts.cUSD);
    // Initial price: 1 CELO = 0.50 cUSD
    initialPrice = contracts.cUSD.toLowerCase() < contracts.CELO.toLowerCase() ? 0.5 : 2;
    console.log(`\nCreating CELO/cUSD pool`);
  }

  console.log(`Token0: ${token0}`);
  console.log(`Token1: ${token1}`);
  console.log(`Initial Price: ${initialPrice}`);

  // Pool key
  const poolKey = {
    currency0: token0 as `0x${string}`,
    currency1: token1 as `0x${string}`,
    fee: DYNAMIC_FEE_FLAG,
    tickSpacing: 60,
    hooks: contracts.hook,
  };

  // Calculate sqrtPriceX96
  const sqrtPriceX96 = priceToSqrtPriceX96(initialPrice);
  console.log(`sqrtPriceX96: ${sqrtPriceX96}`);

  // Estimate gas
  console.log('\nEstimating gas...');
  try {
    const gas = await publicClient.estimateContractGas({
      address: contracts.poolManager,
      abi: POOL_MANAGER_ABI,
      functionName: 'initialize',
      args: [poolKey, sqrtPriceX96],
      account: account.address,
    });
    console.log(`Estimated gas: ${gas}`);
  } catch (error: any) {
    if (error.message?.includes('already initialized') || error.message?.includes('PoolAlreadyInitialized')) {
      console.log('\n⚠️  Pool already exists!');
      console.log('This token pair with the DynamicFeeHook has already been initialized.');
      process.exit(0);
    }
    console.error('Gas estimation failed:', error.message);
  }

  // Send transaction
  console.log('\nSending transaction...');
  try {
    const hash = await walletClient.writeContract({
      address: contracts.poolManager,
      abi: POOL_MANAGER_ABI,
      functionName: 'initialize',
      args: [poolKey, sqrtPriceX96],
    });

    console.log(`Transaction hash: ${hash}`);
    console.log(`Explorer: ${network === 'base' ? 'https://basescan.org' : 'https://celoscan.io'}/tx/${hash}`);

    // Wait for confirmation
    console.log('\nWaiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log('\n✅ Pool created successfully!');
      console.log(`Block: ${receipt.blockNumber}`);
      console.log(`Gas used: ${receipt.gasUsed}`);
    } else {
      console.log('\n❌ Transaction failed');
    }
  } catch (error: any) {
    console.error('\n❌ Transaction failed:', error.message);
    
    if (error.message?.includes('insufficient funds')) {
      console.log('\nYou need more ETH/CELO for gas fees.');
    }
  }
}

main().catch(console.error);

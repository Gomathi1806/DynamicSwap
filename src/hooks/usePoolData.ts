'use client';

import { useReadContract, useReadContracts, useChainId } from 'wagmi';
import { CONTRACTS, TOKENS, isSupportedChain, type SupportedChainId } from '@/contracts/addresses';
import { POOL_MANAGER_ABI, STATE_VIEW_ABI, DYNAMIC_FEE_HOOK_ABI, ERC20_ABI } from '@/contracts/abis';
import { 
  getPoolId, 
  sortTokens, 
  sqrtPriceX96ToPrice, 
  tickToPrice, 
  formatFee,
  type PoolKey 
} from '@/lib/pool-utils';

// Pool data structure
export interface PoolData {
  poolId: `0x${string}`;
  poolKey: PoolKey;
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
  lpFee: number;
  protocolFee: number;
  price: number;
  token0Symbol: string;
  token1Symbol: string;
  token0Decimals: number;
  token1Decimals: number;
}

// Hook to get pool data
export function usePoolData(poolKey: PoolKey | null) {
  const chainId = useChainId();
  const contracts = isSupportedChain(chainId) ? CONTRACTS[chainId] : null;
  const poolId = poolKey ? getPoolId(poolKey) : null;

  // Read slot0 (price, tick, fees)
  const { data: slot0Data, isLoading: slot0Loading, refetch: refetchSlot0 } = useReadContract({
    address: contracts?.stateView,
    abi: STATE_VIEW_ABI,
    functionName: 'getSlot0',
    args: poolId && contracts ? [contracts.poolManager, poolId] : undefined,
    query: {
      enabled: !!poolId && !!contracts,
      refetchInterval: 10000, // Refresh every 10 seconds
    },
  });

  // Read liquidity
  const { data: liquidityData, isLoading: liquidityLoading, refetch: refetchLiquidity } = useReadContract({
    address: contracts?.stateView,
    abi: STATE_VIEW_ABI,
    functionName: 'getLiquidity',
    args: poolId && contracts ? [contracts.poolManager, poolId] : undefined,
    query: {
      enabled: !!poolId && !!contracts,
      refetchInterval: 10000,
    },
  });

  const isLoading = slot0Loading || liquidityLoading;

  // Parse the data
  let poolData: PoolData | null = null;
  
  if (poolKey && slot0Data && liquidityData !== undefined) {
    const [sqrtPriceX96, tick, protocolFee, lpFee] = slot0Data;
    
    // Find token info
    const tokens = isSupportedChain(chainId) ? TOKENS[chainId] : null;
    const token0Info = tokens ? Object.values(tokens).find(t => 
      t.address.toLowerCase() === poolKey.currency0.toLowerCase()
    ) : null;
    const token1Info = tokens ? Object.values(tokens).find(t => 
      t.address.toLowerCase() === poolKey.currency1.toLowerCase()
    ) : null;

    const decimals0 = token0Info?.decimals || 18;
    const decimals1 = token1Info?.decimals || 18;

    poolData = {
      poolId: poolId!,
      poolKey,
      sqrtPriceX96,
      tick,
      liquidity: liquidityData as bigint,
      lpFee,
      protocolFee,
      price: sqrtPriceX96ToPrice(sqrtPriceX96, decimals0, decimals1),
      token0Symbol: token0Info?.symbol || 'Token0',
      token1Symbol: token1Info?.symbol || 'Token1',
      token0Decimals: decimals0,
      token1Decimals: decimals1,
    };
  }

  return {
    poolData,
    isLoading,
    refetch: () => {
      refetchSlot0();
      refetchLiquidity();
    },
  };
}

// Hook to get current dynamic fee from hook
export function useDynamicFee(poolKey: PoolKey | null) {
  const chainId = useChainId();
  const contracts = isSupportedChain(chainId) ? CONTRACTS[chainId] : null;

  const { data: feeData, isLoading } = useReadContract({
    address: contracts?.hook,
    abi: DYNAMIC_FEE_HOOK_ABI,
    functionName: 'getFee',
    args: poolKey ? [poolKey] : undefined,
    query: {
      enabled: !!poolKey && !!contracts,
      refetchInterval: 5000, // Refresh every 5 seconds for fee updates
    },
  });

  return {
    fee: feeData as number | undefined,
    feeFormatted: feeData ? formatFee(feeData as number) : undefined,
    isLoading,
  };
}

// Hook to get token balance
export function useTokenBalance(tokenAddress: `0x${string}` | null, userAddress: `0x${string}` | null) {
  const { data: balance, isLoading, refetch } = useReadContract({
    address: tokenAddress || undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!userAddress && tokenAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  return {
    balance: balance as bigint | undefined,
    isLoading,
    refetch,
  };
}

// Hook to get token allowance
export function useTokenAllowance(
  tokenAddress: `0x${string}` | null,
  ownerAddress: `0x${string}` | null,
  spenderAddress: `0x${string}` | null
) {
  const { data: allowance, isLoading, refetch } = useReadContract({
    address: tokenAddress || undefined,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: ownerAddress && spenderAddress ? [ownerAddress, spenderAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!ownerAddress && !!spenderAddress && 
               tokenAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  return {
    allowance: allowance as bigint | undefined,
    isLoading,
    refetch,
  };
}

// Hook to get multiple token balances
export function useMultipleTokenBalances(
  tokenAddresses: `0x${string}`[],
  userAddress: `0x${string}` | null
) {
  const contracts = tokenAddresses
    .filter(addr => addr !== '0x0000000000000000000000000000000000000000')
    .map(address => ({
      address,
      abi: ERC20_ABI,
      functionName: 'balanceOf' as const,
      args: userAddress ? [userAddress] : undefined,
    }));

  const { data, isLoading } = useReadContracts({
    contracts: contracts as any,
    query: {
      enabled: !!userAddress && contracts.length > 0,
    },
  });

  const balances: Record<string, bigint> = {};
  if (data) {
    tokenAddresses
      .filter(addr => addr !== '0x0000000000000000000000000000000000000000')
      .forEach((addr, index) => {
        if (data[index]?.result) {
          balances[addr.toLowerCase()] = data[index].result as bigint;
        }
      });
  }

  return { balances, isLoading };
}

// Hook to check if pool exists
export function usePoolExists(poolKey: PoolKey | null) {
  const { poolData, isLoading } = usePoolData(poolKey);
  
  // Pool exists if it has been initialized (sqrtPriceX96 > 0)
  const exists = poolData ? poolData.sqrtPriceX96 > 0n : false;
  
  return { exists, isLoading };
}

// Known pools for the DynamicFeeHook
export function useKnownPools() {
  const chainId = useChainId();
  const contracts = isSupportedChain(chainId) ? CONTRACTS[chainId] : null;
  const tokens = isSupportedChain(chainId) ? TOKENS[chainId] : null;

  // Define known pool keys for our hook
  // These would be pools we've created or know about
  const knownPoolKeys: PoolKey[] = [];

  if (contracts && tokens && chainId === 8453) {
    // Base pools
    // Example: WETH/USDC pool
    const [currency0, currency1] = sortTokens(
      tokens.WETH.address,
      tokens.USDC.address
    );
    knownPoolKeys.push({
      currency0,
      currency1,
      fee: 0x800000, // Dynamic fee flag
      tickSpacing: 60,
      hooks: contracts.hook,
    });
  }

  if (contracts && tokens && chainId === 42220) {
    // Celo pools
    // Example: CELO/cUSD pool
    const [currency0, currency1] = sortTokens(
      tokens.CELO.address,
      tokens.cUSD.address
    );
    knownPoolKeys.push({
      currency0,
      currency1,
      fee: 0x800000,
      tickSpacing: 60,
      hooks: contracts.hook,
    });
  }

  return { knownPoolKeys, chainId };
}

'use client';

import { useWriteContract, useWaitForTransactionReceipt, useChainId, useAccount } from 'wagmi';
import { parseUnits, encodeFunctionData, encodeAbiParameters, parseAbiParameters } from 'viem';
import { CONTRACTS, isSupportedChain } from '@/contracts/addresses';
import { POOL_MANAGER_ABI, POSITION_MANAGER_ABI, ERC20_ABI, PERMIT2_ABI } from '@/contracts/abis';
import { 
  type PoolKey, 
  priceToSqrtPriceX96, 
  getFullRangeTicks,
  sortTokens,
  DYNAMIC_FEE_FLAG 
} from '@/lib/pool-utils';
import { useState, useCallback } from 'react';

// Hook for creating a new pool
export function useCreatePool() {
  const chainId = useChainId();
  const contracts = isSupportedChain(chainId) ? CONTRACTS[chainId] : null;
  
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const createPool = useCallback(async (
    token0Address: `0x${string}`,
    token1Address: `0x${string}`,
    initialPrice: number,
    tickSpacing: number = 60
  ) => {
    if (!contracts) throw new Error('Chain not supported');

    // Sort tokens
    const [currency0, currency1] = sortTokens(token0Address, token1Address);
    
    // Calculate sqrtPriceX96 from price
    // If tokens were swapped, invert the price
    const needsInversion = currency0.toLowerCase() !== token0Address.toLowerCase();
    const adjustedPrice = needsInversion ? 1 / initialPrice : initialPrice;
    const sqrtPriceX96 = priceToSqrtPriceX96(adjustedPrice);

    // Pool key with dynamic fee flag
    const poolKey: PoolKey = {
      currency0,
      currency1,
      fee: DYNAMIC_FEE_FLAG, // Dynamic fee
      tickSpacing,
      hooks: contracts.hook,
    };

    // Initialize pool
    writeContract({
      address: contracts.poolManager,
      abi: POOL_MANAGER_ABI,
      functionName: 'initialize',
      args: [poolKey, sqrtPriceX96],
    });

    return poolKey;
  }, [contracts, writeContract]);

  return {
    createPool,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

// Hook for approving tokens
export function useApproveToken() {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = useCallback(async (
    tokenAddress: `0x${string}`,
    spenderAddress: `0x${string}`,
    amount: bigint
  ) => {
    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spenderAddress, amount],
    });
  }, [writeContract]);

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

// Hook for adding liquidity
export function useAddLiquidity() {
  const chainId = useChainId();
  const { address: userAddress } = useAccount();
  const contracts = isSupportedChain(chainId) ? CONTRACTS[chainId] : null;
  
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const addLiquidity = useCallback(async (
    poolKey: PoolKey,
    amount0: bigint,
    amount1: bigint,
    tickLower?: number,
    tickUpper?: number
  ) => {
    if (!contracts || !userAddress) throw new Error('Not connected');

    // Use full range if ticks not specified
    const [minTick, maxTick] = getFullRangeTicks(poolKey.tickSpacing);
    const finalTickLower = tickLower ?? minTick;
    const finalTickUpper = tickUpper ?? maxTick;

    // Encode the mint action
    // Actions.MINT = 0x00
    // Actions.SETTLE_PAIR = 0x10
    const MINT = 0x00;
    const SETTLE_PAIR = 0x10;

    // Encode mint params
    const mintParams = encodeAbiParameters(
      parseAbiParameters('(address,address,uint24,int24,address) poolKey, int24 tickLower, int24 tickUpper, uint256 liquidity, uint128 amount0Max, uint128 amount1Max, address owner, bytes hookData'),
      [
        [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
        finalTickLower,
        finalTickUpper,
        amount0, // Using amount as liquidity for simplicity
        amount0,
        amount1,
        userAddress,
        '0x' as `0x${string}`,
      ]
    );

    // Encode settle pair params
    const settleParams = encodeAbiParameters(
      parseAbiParameters('address currency0, address currency1'),
      [poolKey.currency0, poolKey.currency1]
    );

    // Build the actions bytes
    const actions = new Uint8Array([MINT, SETTLE_PAIR]);
    const actionsHex = `0x${Buffer.from(actions).toString('hex')}` as `0x${string}`;

    // Deadline
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour

    // Call modifyLiquidities
    writeContract({
      address: contracts.positionManager,
      abi: POSITION_MANAGER_ABI,
      functionName: 'modifyLiquidities',
      args: [
        encodeAbiParameters(
          parseAbiParameters('bytes actions, bytes[] params'),
          [actionsHex, [mintParams, settleParams]]
        ),
        deadline,
      ],
      value: poolKey.currency0 === '0x0000000000000000000000000000000000000000' ? amount0 :
             poolKey.currency1 === '0x0000000000000000000000000000000000000000' ? amount1 : 0n,
    });
  }, [contracts, userAddress, writeContract]);

  return {
    addLiquidity,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

// Simplified transaction status hook
export function useTransactionStatus(hash: `0x${string}` | undefined) {
  const { isLoading, isSuccess, isError, error } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    isLoading,
    isSuccess,
    isError,
    error,
  };
}

// Multi-step transaction manager
export interface TransactionStep {
  id: string;
  title: string;
  status: 'pending' | 'signing' | 'confirming' | 'success' | 'error';
  hash?: `0x${string}`;
  error?: string;
}

export function useTransactionSteps() {
  const [steps, setSteps] = useState<TransactionStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const addStep = useCallback((step: Omit<TransactionStep, 'status'>) => {
    setSteps(prev => [...prev, { ...step, status: 'pending' }]);
  }, []);

  const updateStep = useCallback((id: string, update: Partial<TransactionStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, ...update } : step
    ));
  }, []);

  const reset = useCallback(() => {
    setSteps([]);
    setCurrentStep(0);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => prev + 1);
  }, []);

  return {
    steps,
    currentStep,
    addStep,
    updateStep,
    reset,
    nextStep,
  };
}

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAccount, useChainId, useBalance, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, maxUint256 } from 'viem';
import { TokenSelector, AmountInput } from './TokenSelector';
import { usePoolData, useDynamicFee, useTokenBalance, useTokenAllowance } from '@/hooks/usePoolData';
import { useApproveToken, useAddLiquidity } from '@/hooks/useTransactions';
import { CONTRACTS, CHAIN_INFO, isSupportedChain } from '@/contracts/addresses';
import { sortTokens, DYNAMIC_FEE_FLAG, getFullRangeTicks, type PoolKey } from '@/lib/pool-utils';

interface Token {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
}

export function LiquidityPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const contracts = isSupportedChain(chainId) ? CONTRACTS[chainId] : null;
  const chainInfo = isSupportedChain(chainId) ? CHAIN_INFO[chainId] : null;

  const [token0, setToken0] = useState<Token | null>(null);
  const [token1, setToken1] = useState<Token | null>(null);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [useFullRange, setUseFullRange] = useState(true);
  const [step, setStep] = useState<'input' | 'approve0' | 'approve1' | 'add'>('input');

  // Get native balance
  const { data: nativeBalance } = useBalance({ address });

  // Get token balances
  const { balance: balance0 } = useTokenBalance(
    token0?.address !== '0x0000000000000000000000000000000000000000' ? token0?.address || null : null,
    address || null
  );
  const { balance: balance1 } = useTokenBalance(
    token1?.address !== '0x0000000000000000000000000000000000000000' ? token1?.address || null : null,
    address || null
  );

  // Get display balances
  const displayBalance0 = useMemo(() => {
    if (!token0) return undefined;
    if (token0.address === '0x0000000000000000000000000000000000000000') {
      return nativeBalance?.value;
    }
    return balance0;
  }, [token0, nativeBalance, balance0]);

  const displayBalance1 = useMemo(() => {
    if (!token1) return undefined;
    if (token1.address === '0x0000000000000000000000000000000000000000') {
      return nativeBalance?.value;
    }
    return balance1;
  }, [token1, nativeBalance, balance1]);

  // Get allowances
  const { allowance: allowance0, refetch: refetchAllowance0 } = useTokenAllowance(
    token0?.address !== '0x0000000000000000000000000000000000000000' ? token0?.address || null : null,
    address || null,
    contracts?.positionManager || null
  );
  const { allowance: allowance1, refetch: refetchAllowance1 } = useTokenAllowance(
    token1?.address !== '0x0000000000000000000000000000000000000000' ? token1?.address || null : null,
    address || null,
    contracts?.positionManager || null
  );

  // Build pool key
  const poolKey = useMemo<PoolKey | null>(() => {
    if (!token0 || !token1 || !contracts) return null;
    
    const [currency0, currency1] = sortTokens(token0.address, token1.address);
    return {
      currency0,
      currency1,
      fee: DYNAMIC_FEE_FLAG,
      tickSpacing: 60,
      hooks: contracts.hook,
    };
  }, [token0, token1, contracts]);

  // Get pool data
  const { poolData, isLoading: poolLoading } = usePoolData(poolKey);
  const { feeFormatted } = useDynamicFee(poolKey);

  // Pool exists check
  const poolExists = poolData && poolData.sqrtPriceX96 > 0n;

  // Approve token hooks
  const { 
    approve: approve0, 
    hash: approveHash0, 
    isPending: approving0, 
    isConfirming: confirmingApprove0,
    isSuccess: approved0,
    reset: resetApprove0
  } = useApproveToken();

  const { 
    approve: approve1, 
    hash: approveHash1, 
    isPending: approving1, 
    isConfirming: confirmingApprove1,
    isSuccess: approved1,
    reset: resetApprove1
  } = useApproveToken();

  // Add liquidity hook
  const {
    addLiquidity,
    hash: addLiqHash,
    isPending: addingLiquidity,
    isConfirming: confirmingAdd,
    isSuccess: addedLiquidity,
    error: addError,
    reset: resetAdd
  } = useAddLiquidity();

  // Check if approvals are needed
  const needsApproval0 = useMemo(() => {
    if (!token0 || token0.address === '0x0000000000000000000000000000000000000000') return false;
    if (!amount0 || !allowance0) return true;
    try {
      const amountWei = parseUnits(amount0, token0.decimals);
      return allowance0 < amountWei;
    } catch {
      return true;
    }
  }, [token0, amount0, allowance0]);

  const needsApproval1 = useMemo(() => {
    if (!token1 || token1.address === '0x0000000000000000000000000000000000000000') return false;
    if (!amount1 || !allowance1) return true;
    try {
      const amountWei = parseUnits(amount1, token1.decimals);
      return allowance1 < amountWei;
    } catch {
      return true;
    }
  }, [token1, amount1, allowance1]);

  // Handle approval
  const handleApprove0 = async () => {
    if (!token0 || !contracts) return;
    await approve0(token0.address, contracts.positionManager, maxUint256);
  };

  const handleApprove1 = async () => {
    if (!token1 || !contracts) return;
    await approve1(token1.address, contracts.positionManager, maxUint256);
  };

  // Refetch allowances after approval
  useEffect(() => {
    if (approved0) {
      refetchAllowance0();
    }
  }, [approved0, refetchAllowance0]);

  useEffect(() => {
    if (approved1) {
      refetchAllowance1();
    }
  }, [approved1, refetchAllowance1]);

  // Handle add liquidity
  const handleAddLiquidity = async () => {
    if (!poolKey || !token0 || !token1) return;
    
    try {
      const amount0Wei = parseUnits(amount0, token0.decimals);
      const amount1Wei = parseUnits(amount1, token1.decimals);

      // Get tick range
      const [tickLower, tickUpper] = useFullRange 
        ? getFullRangeTicks(poolKey.tickSpacing)
        : getFullRangeTicks(poolKey.tickSpacing); // For now, always full range

      await addLiquidity(poolKey, amount0Wei, amount1Wei, tickLower, tickUpper);
    } catch (err) {
      console.error('Add liquidity failed:', err);
    }
  };

  // Determine button state
  const getButtonConfig = () => {
    if (!isConnected) return { text: 'Connect Wallet', disabled: true };
    if (!token0 || !token1) return { text: 'Select Tokens', disabled: true };
    if (!poolExists) return { text: 'Pool Not Found', disabled: true };
    if (!amount0 || !amount1) return { text: 'Enter Amounts', disabled: true };
    if (needsApproval0) return { 
      text: approving0 || confirmingApprove0 ? 'Approving...' : `Approve ${token0.symbol}`, 
      disabled: approving0 || confirmingApprove0,
      action: handleApprove0 
    };
    if (needsApproval1) return { 
      text: approving1 || confirmingApprove1 ? 'Approving...' : `Approve ${token1.symbol}`, 
      disabled: approving1 || confirmingApprove1,
      action: handleApprove1 
    };
    if (addingLiquidity || confirmingAdd) return { text: 'Adding Liquidity...', disabled: true };
    return { text: 'Add Liquidity', disabled: false, action: handleAddLiquidity };
  };

  const buttonConfig = getButtonConfig();

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Add Liquidity</h2>
        <p className="text-white/60">Earn dynamic fees as an LP</p>
      </div>

      <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-6">
        {/* Token Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <TokenSelector
              selectedToken={token0}
              onSelect={setToken0}
              label="Token 0"
              otherToken={token1}
              balance={displayBalance0}
            />
            <AmountInput
              value={amount0}
              onChange={setAmount0}
              token={token0}
              balance={displayBalance0}
            />
          </div>
          <div className="space-y-3">
            <TokenSelector
              selectedToken={token1}
              onSelect={setToken1}
              label="Token 1"
              otherToken={token0}
              balance={displayBalance1}
            />
            <AmountInput
              value={amount1}
              onChange={setAmount1}
              token={token1}
              balance={displayBalance1}
            />
          </div>
        </div>

        {/* Range Selection */}
        <div>
          <label className="block text-sm text-white/60 mb-2">Position Range</label>
          <div className="flex gap-2">
            <button
              onClick={() => setUseFullRange(true)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                useFullRange
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
              }`}
            >
              Full Range
            </button>
            <button
              onClick={() => setUseFullRange(false)}
              disabled
              className="flex-1 py-3 px-4 rounded-xl text-sm font-medium bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"
            >
              Custom Range (Coming Soon)
            </button>
          </div>
        </div>

        {/* Pool Info */}
        {token0 && token1 && (
          <div className={`rounded-xl p-4 border ${
            poolLoading 
              ? 'bg-white/5 border-white/10' 
              : poolExists 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-red-500/10 border-red-500/30'
          }`}>
            {poolLoading ? (
              <div className="flex items-center gap-2 text-white/60">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white/60 rounded-full animate-spin" />
                Loading pool data...
              </div>
            ) : poolExists ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/60">Pool Status</span>
                  <span className="text-green-400 font-semibold">Active ✓</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Current Fee</span>
                  <span className="text-cyan-400 font-semibold">{feeFormatted || '0.30%'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Total Liquidity</span>
                  <span className="text-white font-mono text-sm">
                    {poolData?.liquidity.toString().slice(0, 12)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Your Share</span>
                  <span className="text-white font-semibold">90% of fees</span>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-red-400 font-semibold">Pool Not Found</div>
                <p className="text-sm text-white/50 mt-1">Create this pool first in the "Create Pool" tab</p>
              </div>
            )}
          </div>
        )}

        {/* Transaction Status */}
        {addedLiquidity && addLiqHash && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <span className="font-semibold text-green-400">✓ Liquidity Added!</span>
            <a
              href={`${chainInfo?.explorer}/tx/${addLiqHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-cyan-400 hover:underline mt-1"
            >
              View transaction ↗
            </a>
          </div>
        )}

        {addError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <span className="font-semibold text-red-400">Error</span>
            <p className="text-sm text-white/60 mt-1">{addError.message}</p>
            <button onClick={resetAdd} className="text-sm text-cyan-400 hover:underline mt-2">
              Try again
            </button>
          </div>
        )}

        {/* Main Action Button */}
        <button
          onClick={buttonConfig.action}
          disabled={buttonConfig.disabled}
          className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {buttonConfig.text}
        </button>

        {/* Fee Info */}
        <div className="text-center text-sm text-white/40">
          <p>As an LP, you'll earn 90% of all trading fees from this pool.</p>
          <p className="mt-1">Fees range from 0.30% to 1.00% based on volatility.</p>
        </div>
      </div>
    </div>
  );
}

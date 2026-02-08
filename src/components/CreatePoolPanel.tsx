'use client';

import { useState, useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { TokenSelector } from './TokenSelector';
import { useCreatePool } from '@/hooks/useTransactions';
import { usePoolExists } from '@/hooks/usePoolData';
import { CONTRACTS, CHAIN_INFO, isSupportedChain } from '@/contracts/addresses';
import { sortTokens, DYNAMIC_FEE_FLAG, type PoolKey, getPoolId } from '@/lib/pool-utils';

interface Token {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
}

export function CreatePoolPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const contracts = isSupportedChain(chainId) ? CONTRACTS[chainId] : null;
  const chainInfo = isSupportedChain(chainId) ? CHAIN_INFO[chainId] : null;

  const [token0, setToken0] = useState<Token | null>(null);
  const [token1, setToken1] = useState<Token | null>(null);
  const [initialPrice, setInitialPrice] = useState('1');
  const [tickSpacing, setTickSpacing] = useState(60);

  // Build pool key for checking existence
  const poolKey = useMemo<PoolKey | null>(() => {
    if (!token0 || !token1 || !contracts) return null;
    
    const [currency0, currency1] = sortTokens(token0.address, token1.address);
    return {
      currency0,
      currency1,
      fee: DYNAMIC_FEE_FLAG,
      tickSpacing,
      hooks: contracts.hook,
    };
  }, [token0, token1, contracts, tickSpacing]);

  // Check if pool exists
  const { exists: poolExists, isLoading: checkingPool } = usePoolExists(poolKey);

  // Create pool hook
  const { 
    createPool, 
    hash, 
    isPending, 
    isConfirming, 
    isSuccess, 
    error,
    reset 
  } = useCreatePool();

  // Handle pool creation
  const handleCreatePool = async () => {
    if (!token0 || !token1 || !contracts) return;

    try {
      const price = parseFloat(initialPrice);
      if (isNaN(price) || price <= 0) {
        alert('Please enter a valid initial price');
        return;
      }

      await createPool(
        token0.address,
        token1.address,
        price,
        tickSpacing
      );
    } catch (err) {
      console.error('Pool creation failed:', err);
    }
  };

  // Get sorted token symbols for display
  const sortedSymbols = useMemo(() => {
    if (!token0 || !token1) return null;
    const [addr0] = sortTokens(token0.address, token1.address);
    return addr0.toLowerCase() === token0.address.toLowerCase()
      ? [token0.symbol, token1.symbol]
      : [token1.symbol, token0.symbol];
  }, [token0, token1]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Create Pool</h2>
        <p className="text-white/60">Launch a pool with DynamicFeeHook</p>
      </div>

      <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-6">
        {/* Token Selection */}
        <div className="grid grid-cols-2 gap-4">
          <TokenSelector
            selectedToken={token0}
            onSelect={setToken0}
            label="Token 0"
            otherToken={token1}
          />
          <TokenSelector
            selectedToken={token1}
            onSelect={setToken1}
            label="Token 1"
            otherToken={token0}
          />
        </div>

        {/* Initial Price */}
        <div>
          <label className="block text-sm text-white/60 mb-2">
            Initial Price ({token1?.symbol || 'Token1'} per {token0?.symbol || 'Token0'})
          </label>
          <input
            type="text"
            value={initialPrice}
            onChange={(e) => {
              if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                setInitialPrice(e.target.value);
              }
            }}
            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-cyan-500"
            placeholder="1.0"
          />
        </div>

        {/* Tick Spacing */}
        <div>
          <label className="block text-sm text-white/60 mb-2">Tick Spacing</label>
          <div className="flex gap-2">
            {[
              { value: 1, label: 'Stable (1)' },
              { value: 60, label: 'Standard (60)' },
              { value: 200, label: 'Volatile (200)' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setTickSpacing(option.value)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  tickSpacing === option.value
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hook Info */}
        <div className="bg-cyan-500/10 rounded-xl p-4 border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-cyan-400 text-xl">⚡</span>
            <span className="font-semibold text-cyan-400">DynamicFeeHook</span>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-white/70">
              <span className="text-green-400">✓</span>
              Fees auto-adjust 0.30% → 1.00% based on volatility
            </li>
            <li className="flex items-center gap-2 text-white/70">
              <span className="text-green-400">✓</span>
              LPs earn 90% of trading fees
            </li>
            <li className="flex items-center gap-2 text-white/70">
              <span className="text-green-400">✓</span>
              Higher fees during high volatility = LP protection
            </li>
          </ul>
          <div className="mt-3 pt-3 border-t border-white/10">
            <span className="text-xs text-white/40 font-mono break-all">
              {contracts?.hook}
            </span>
          </div>
        </div>

        {/* Pool Status */}
        {token0 && token1 && (
          <div className={`rounded-xl p-4 ${
            checkingPool 
              ? 'bg-white/5 border border-white/10' 
              : poolExists 
                ? 'bg-yellow-500/10 border border-yellow-500/30' 
                : 'bg-green-500/10 border border-green-500/30'
          }`}>
            {checkingPool ? (
              <div className="flex items-center gap-2 text-white/60">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white/60 rounded-full animate-spin" />
                Checking if pool exists...
              </div>
            ) : poolExists ? (
              <div className="text-yellow-400">
                <span className="font-semibold">⚠️ Pool Already Exists</span>
                <p className="text-sm text-white/60 mt-1">
                  This pool has already been created. You can add liquidity instead.
                </p>
              </div>
            ) : (
              <div className="text-green-400">
                <span className="font-semibold">✓ Pool Available</span>
                <p className="text-sm text-white/60 mt-1">
                  This pool doesn't exist yet. You can create it!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Transaction Status */}
        {(isPending || isConfirming || isSuccess || error) && (
          <div className={`rounded-xl p-4 ${
            error ? 'bg-red-500/10 border border-red-500/30' :
            isSuccess ? 'bg-green-500/10 border border-green-500/30' :
            'bg-white/5 border border-white/10'
          }`}>
            {isPending && (
              <div className="flex items-center gap-2 text-white">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white/60 rounded-full animate-spin" />
                Please confirm in your wallet...
              </div>
            )}
            {isConfirming && (
              <div className="flex items-center gap-2 text-white">
                <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                Transaction confirming...
              </div>
            )}
            {isSuccess && hash && (
              <div className="text-green-400">
                <span className="font-semibold">✓ Pool Created!</span>
                <a
                  href={`${chainInfo?.explorer}/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-cyan-400 hover:underline mt-1"
                >
                  View transaction ↗
                </a>
              </div>
            )}
            {error && (
              <div className="text-red-400">
                <span className="font-semibold">Error</span>
                <p className="text-sm text-white/60 mt-1">{error.message}</p>
                <button
                  onClick={reset}
                  className="text-sm text-cyan-400 hover:underline mt-2"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Create Button */}
        <button
          onClick={handleCreatePool}
          disabled={!isConnected || !token0 || !token1 || poolExists || isPending || isConfirming}
          className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!isConnected ? 'Connect Wallet' :
           !token0 || !token1 ? 'Select Tokens' :
           poolExists ? 'Pool Already Exists' :
           isPending ? 'Confirming...' :
           isConfirming ? 'Creating Pool...' :
           'Create Pool'}
        </button>

        {/* Cost Estimate */}
        <p className="text-center text-sm text-white/40">
          Estimated cost: ~$3-5 on Base, ~$0.10 on Celo
        </p>
      </div>
    </div>
  );
}

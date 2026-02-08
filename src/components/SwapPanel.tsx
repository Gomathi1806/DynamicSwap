'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useChainId, useBalance } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { TokenSelector, AmountInput } from './TokenSelector';
import { usePoolData, useDynamicFee, useTokenBalance } from '@/hooks/usePoolData';
import { CONTRACTS, isSupportedChain, getTokenList } from '@/contracts/addresses';
import { sortTokens, getPoolId, DYNAMIC_FEE_FLAG, type PoolKey } from '@/lib/pool-utils';

interface Token {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
}

export function SwapPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const contracts = isSupportedChain(chainId) ? CONTRACTS[chainId] : null;

  const [tokenIn, setTokenIn] = useState<Token | null>(null);
  const [tokenOut, setTokenOut] = useState<Token | null>(null);
  const [amountIn, setAmountIn] = useState('');
  const [slippage, setSlippage] = useState('0.5');

  // Get native balance
  const { data: nativeBalance } = useBalance({ address });

  // Get token balances
  const { balance: tokenInBalance } = useTokenBalance(
    tokenIn?.address !== '0x0000000000000000000000000000000000000000' ? tokenIn?.address || null : null,
    address || null
  );

  // Determine the balance to show
  const displayBalance = useMemo(() => {
    if (!tokenIn) return undefined;
    if (tokenIn.address === '0x0000000000000000000000000000000000000000') {
      return nativeBalance?.value;
    }
    return tokenInBalance;
  }, [tokenIn, nativeBalance, tokenInBalance]);

  // Build pool key for the selected pair
  const poolKey = useMemo<PoolKey | null>(() => {
    if (!tokenIn || !tokenOut || !contracts) return null;
    
    const [currency0, currency1] = sortTokens(tokenIn.address, tokenOut.address);
    return {
      currency0,
      currency1,
      fee: DYNAMIC_FEE_FLAG,
      tickSpacing: 60,
      hooks: contracts.hook,
    };
  }, [tokenIn, tokenOut, contracts]);

  // Get pool data
  const { poolData, isLoading: poolLoading } = usePoolData(poolKey);

  // Get current dynamic fee
  const { fee, feeFormatted, isLoading: feeLoading } = useDynamicFee(poolKey);

  // Calculate output amount
  const amountOut = useMemo(() => {
    if (!amountIn || !tokenIn || !tokenOut || !poolData) return '';
    
    try {
      const inputAmount = parseFloat(amountIn);
      if (isNaN(inputAmount) || inputAmount <= 0) return '';

      // Simple calculation based on pool price
      const feeRate = fee ? fee / 1000000 : 0.003; // Default 0.3%
      const amountAfterFee = inputAmount * (1 - feeRate);
      
      // Adjust for price - this is simplified
      const isToken0In = tokenIn.address.toLowerCase() < tokenOut.address.toLowerCase();
      const price = poolData.price;
      
      const outputAmount = isToken0In 
        ? amountAfterFee * price 
        : amountAfterFee / price;

      return outputAmount.toFixed(tokenOut.decimals > 6 ? 6 : tokenOut.decimals);
    } catch {
      return '';
    }
  }, [amountIn, tokenIn, tokenOut, poolData, fee]);

  // Pool exists check
  const poolExists = poolData && poolData.sqrtPriceX96 > 0n;

  // Swap tokens
  const handleSwapTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
    setAmountIn('');
  };

  // Handle swap execution
  const handleSwap = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    if (!poolExists) {
      alert('Pool does not exist. Create it first!');
      return;
    }
    
    // TODO: Implement actual swap logic via Universal Router
    alert(`Swap feature coming soon!\n\nWould swap:\n${amountIn} ${tokenIn?.symbol} → ${amountOut} ${tokenOut?.symbol}\nFee: ${feeFormatted || 'N/A'}`);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Swap</h2>
        <p className="text-white/60">Trade with dynamic fee protection</p>
      </div>

      <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
        {/* From */}
        <div className="bg-white/5 rounded-xl p-4 space-y-3">
          <TokenSelector
            selectedToken={tokenIn}
            onSelect={setTokenIn}
            label="From"
            otherToken={tokenOut}
            balance={displayBalance}
          />
          <AmountInput
            value={amountIn}
            onChange={setAmountIn}
            token={tokenIn}
            balance={displayBalance}
          />
        </div>

        {/* Swap Arrow */}
        <div className="flex justify-center">
          <button
            onClick={handleSwapTokens}
            className="w-10 h-10 bg-slate-800 border-2 border-slate-700 rounded-xl flex items-center justify-center hover:bg-slate-700 hover:border-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* To */}
        <div className="bg-white/5 rounded-xl p-4 space-y-3">
          <TokenSelector
            selectedToken={tokenOut}
            onSelect={setTokenOut}
            label="To"
            otherToken={tokenIn}
          />
          <div className="text-3xl font-bold text-white/60">
            {amountOut || '0.0'}
          </div>
        </div>

        {/* Pool & Fee Info */}
        {tokenIn && tokenOut && (
          <div className={`rounded-xl p-4 border ${
            poolExists 
              ? 'bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-white/10' 
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            {poolLoading || feeLoading ? (
              <div className="text-center text-white/50">Loading pool data...</div>
            ) : poolExists ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/60">Dynamic Fee</span>
                  <span className={`font-bold ${
                    fee && fee < 5000 ? 'text-green-400' : 
                    fee && fee < 8000 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {feeFormatted || '0.30%'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Pool Liquidity</span>
                  <span className="text-white font-mono text-sm">
                    {poolData?.liquidity.toString().slice(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Price</span>
                  <span className="text-white text-sm">
                    1 {poolData?.token0Symbol} = {poolData?.price.toFixed(6)} {poolData?.token1Symbol}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-red-400 font-semibold mb-1">Pool not found</div>
                <div className="text-white/50 text-sm">Create this pool first in the "Create Pool" tab</div>
              </div>
            )}
          </div>
        )}

        {/* Slippage */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Slippage Tolerance</span>
          <div className="flex items-center gap-2">
            {['0.1', '0.5', '1.0'].map(val => (
              <button
                key={val}
                onClick={() => setSlippage(val)}
                className={`px-2 py-1 rounded ${
                  slippage === val 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={!tokenIn || !tokenOut || !amountIn || !poolExists}
          className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!isConnected ? 'Connect Wallet' : 
           !tokenIn || !tokenOut ? 'Select Tokens' :
           !poolExists ? 'Pool Not Found' :
           !amountIn ? 'Enter Amount' : 'Swap'}
        </button>
      </div>
    </div>
  );
}

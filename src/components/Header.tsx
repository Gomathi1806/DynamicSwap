'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useChainId } from 'wagmi';
import { CHAIN_INFO, isSupportedChain } from '@/contracts/addresses';

export function Header() {
  const chainId = useChainId();
  const chainInfo = isSupportedChain(chainId) ? CHAIN_INFO[chainId] : null;

  return (
    <header className="border-b border-white/10 backdrop-blur-xl bg-black/30 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-xl font-bold shadow-lg shadow-purple-500/30">
            ⚡
          </div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              DynamicSwap
            </span>
            <div className="text-xs text-white/40">Uniswap V4 Hook</div>
          </div>
        </div>

        {/* Chain Indicator & Wallet */}
        <div className="flex items-center gap-4">
          {chainInfo && (
            <div 
              className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2"
              style={{ backgroundColor: `${chainInfo.color}20`, color: chainInfo.color }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: chainInfo.color }} />
              {chainInfo.name}
            </div>
          )}
          <ConnectButton 
            showBalance={false}
            chainStatus="icon"
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
          />
        </div>
      </div>
    </header>
  );
}

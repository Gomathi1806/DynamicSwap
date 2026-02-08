'use client';

import { useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { Header } from '@/components/Header';
import { SwapPanel } from '@/components/SwapPanel';
import { LiquidityPanel } from '@/components/LiquidityPanel';
import { CreatePoolPanel } from '@/components/CreatePoolPanel';
import { CONTRACTS, CHAIN_INFO, isSupportedChain } from '@/contracts/addresses';

type Tab = 'swap' | 'liquidity' | 'create';

function TabButton({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 font-semibold text-sm rounded-xl transition-all ${
        active
          ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-purple-500/20'
          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('swap');
  const { isConnected } = useAccount();
  const chainId = useChainId();
  
  const contracts = isSupportedChain(chainId) ? CONTRACTS[chainId] : null;
  const chainInfo = isSupportedChain(chainId) ? CHAIN_INFO[chainId] : null;

  return (
    <div className="min-h-screen">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="relative max-w-xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 justify-center">
          <TabButton active={activeTab === 'swap'} onClick={() => setActiveTab('swap')}>
            Swap
          </TabButton>
          <TabButton active={activeTab === 'liquidity'} onClick={() => setActiveTab('liquidity')}>
            Liquidity
          </TabButton>
          <TabButton active={activeTab === 'create'} onClick={() => setActiveTab('create')}>
            Create Pool
          </TabButton>
        </div>

        {/* Panel Content */}
        {activeTab === 'swap' && <SwapPanel />}
        {activeTab === 'liquidity' && <LiquidityPanel />}
        {activeTab === 'create' && <CreatePoolPanel />}

        {/* Stats Cards */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-xs text-white/50">Dynamic Fee Range</div>
            <div className="text-lg font-bold text-green-400">0.30% - 1.00%</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
            <div className="text-2xl mb-1">🛡️</div>
            <div className="text-xs text-white/50">LP Protection</div>
            <div className="text-lg font-bold text-cyan-400">
              {isConnected ? 'Active' : 'Connect Wallet'}
            </div>
          </div>
        </div>

        {/* Contract Links */}
        {contracts && chainInfo && (
          <div className="mt-6 bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
            <div className="text-xs text-white/50 mb-2">Contract Addresses ({chainInfo.name})</div>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-white/40">Hook:</span>
                <a
                  href={`${chainInfo.explorer}/address/${contracts.hook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  {contracts.hook.slice(0, 10)}...{contracts.hook.slice(-8)} ↗
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">PoolManager:</span>
                <a
                  href={`${chainInfo.explorer}/address/${contracts.poolManager}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white hover:underline"
                >
                  {contracts.poolManager.slice(0, 10)}...{contracts.poolManager.slice(-8)} ↗
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">PositionManager:</span>
                <a
                  href={`${chainInfo.explorer}/address/${contracts.positionManager}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white hover:underline"
                >
                  {contracts.positionManager.slice(0, 10)}...{contracts.positionManager.slice(-8)} ↗
                </a>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/10 mt-12 py-6 text-center text-white/40 text-sm">
        <p>DynamicSwap • Powered by Uniswap V4 • Built for LPs</p>
        <p className="mt-1 text-xs">
          Dynamic fees adjust automatically based on market volatility
        </p>
      </footer>
    </div>
  );
}

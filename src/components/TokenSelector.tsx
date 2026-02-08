'use client';

import { useState, useRef, useEffect } from 'react';
import { useChainId } from 'wagmi';
import { getTokenList, isSupportedChain, TOKENS } from '@/contracts/addresses';
import { formatUnits } from 'viem';

interface Token {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
}

interface TokenSelectorProps {
  selectedToken: Token | null;
  onSelect: (token: Token) => void;
  label: string;
  otherToken?: Token | null;
  balance?: bigint;
  disabled?: boolean;
}

export function TokenSelector({
  selectedToken,
  onSelect,
  label,
  otherToken,
  balance,
  disabled = false,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const chainId = useChainId();

  // Get tokens for current chain
  const tokenList = isSupportedChain(chainId) ? getTokenList(chainId) : [];

  // Filter tokens
  const filteredTokens = tokenList.filter(token => {
    // Don't show the other selected token
    if (otherToken && token.address.toLowerCase() === otherToken.address.toLowerCase()) {
      return false;
    }
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        token.symbol.toLowerCase().includes(searchLower) ||
        token.name.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Token logo component
  const TokenLogo = ({ token }: { token: Token }) => (
    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold">
      {token.symbol.slice(0, 2)}
    </div>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm text-white/60 mb-2">{label}</label>
      
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all ${
          isOpen 
            ? 'border-cyan-500 bg-white/10' 
            : 'border-white/20 bg-white/5 hover:bg-white/10'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {selectedToken ? (
          <div className="flex items-center gap-3">
            <TokenLogo token={selectedToken} />
            <div className="text-left">
              <div className="font-semibold">{selectedToken.symbol}</div>
              <div className="text-xs text-white/50">{selectedToken.name}</div>
            </div>
          </div>
        ) : (
          <span className="text-white/50">Select token</span>
        )}
        
        <div className="flex items-center gap-2">
          {balance !== undefined && selectedToken && (
            <span className="text-sm text-white/50">
              {parseFloat(formatUnits(balance, selectedToken.decimals)).toFixed(4)}
            </span>
          )}
          <svg 
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-white/20 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-white/10">
            <input
              type="text"
              placeholder="Search token..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Token list */}
          <div className="max-h-64 overflow-y-auto">
            {filteredTokens.length > 0 ? (
              filteredTokens.map(token => (
                <button
                  key={token.address}
                  onClick={() => {
                    onSelect(token);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors ${
                    selectedToken?.address.toLowerCase() === token.address.toLowerCase()
                      ? 'bg-white/5'
                      : ''
                  }`}
                >
                  <TokenLogo token={token} />
                  <div className="text-left flex-1">
                    <div className="font-semibold">{token.symbol}</div>
                    <div className="text-xs text-white/50">{token.name}</div>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-white/50">
                No tokens found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Simple amount input with max button
interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  token: Token | null;
  balance?: bigint;
  disabled?: boolean;
  placeholder?: string;
}

export function AmountInput({
  value,
  onChange,
  token,
  balance,
  disabled = false,
  placeholder = '0.0',
}: AmountInputProps) {
  const handleMax = () => {
    if (balance && token) {
      onChange(formatUnits(balance, token.decimals));
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          // Only allow numbers and decimal point
          const val = e.target.value;
          if (val === '' || /^\d*\.?\d*$/.test(val)) {
            onChange(val);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-transparent text-3xl font-bold text-white placeholder-white/30 focus:outline-none disabled:text-white/50"
      />
      {balance !== undefined && balance > 0n && (
        <button
          type="button"
          onClick={handleMax}
          className="absolute right-0 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-400/10 rounded"
        >
          MAX
        </button>
      )}
    </div>
  );
}

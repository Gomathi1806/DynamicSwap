import { base, celo } from 'wagmi/chains';

// Contract addresses for each network
export const CONTRACTS = {
  [base.id]: {
    poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b' as `0x${string}`,
    positionManager: '0x7c5f5a4bbd8fd63184577525326123b519429bdc' as `0x${string}`,
    universalRouter: '0x6ff5693b99212da76ad316178a184ab56d299b43' as `0x${string}`,
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as `0x${string}`,
    stateView: '0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71' as `0x${string}`,
    quoter: '0x0d5e0f971ed27fbff6c2837bf31316121532048d' as `0x${string}`,
    hook: '0x2c80c5cd9fecc3e32dfaa654e022738480a4909a' as `0x${string}`,
  },
  [celo.id]: {
    poolManager: '0x288dc841A52FCA2707c6947B3A777c5E56cd87BC' as `0x${string}`,
    positionManager: '0xf7965f3981e4d5bc383bfbcb61501763e9068ca9' as `0x${string}`,
    universalRouter: '0x6a9bd5f5ac6e9d2bbf1f41b19bd3d17a03d50d9e' as `0x${string}`,
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as `0x${string}`,
    stateView: '0xdC32a998Ef71Ab7e3a41BeDA9b9aF21EA19eC63A' as `0x${string}`,
    quoter: '0x4a6513c898fe1b2d4e60d7bd27e9dd678bdc6b5e' as `0x${string}`,
    hook: '0xe96B2C7416596fE707ba40379B909F42F18d7FC0' as `0x${string}`,
  },
} as const;

// Common tokens for each network
export const TOKENS = {
  [base.id]: {
    NATIVE: {
      address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      logo: '/tokens/eth.svg',
    },
    WETH: {
      address: '0x4200000000000000000000000000000000000006' as `0x${string}`,
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      logo: '/tokens/weth.svg',
    },
    USDC: {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logo: '/tokens/usdc.svg',
    },
    DAI: {
      address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' as `0x${string}`,
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      logo: '/tokens/dai.svg',
    },
    cbBTC: {
      address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf' as `0x${string}`,
      symbol: 'cbBTC',
      name: 'Coinbase Wrapped BTC',
      decimals: 8,
      logo: '/tokens/btc.svg',
    },
  },
  [celo.id]: {
    NATIVE: {
      address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      symbol: 'CELO',
      name: 'Celo',
      decimals: 18,
      logo: '/tokens/celo.svg',
    },
    CELO: {
      address: '0x471EcE3750Da237f93B8E339c536989b8978a438' as `0x${string}`,
      symbol: 'CELO',
      name: 'Celo Native',
      decimals: 18,
      logo: '/tokens/celo.svg',
    },
    cUSD: {
      address: '0x765DE816845861e75A25fCA122bb6898B8B1282a' as `0x${string}`,
      symbol: 'cUSD',
      name: 'Celo Dollar',
      decimals: 18,
      logo: '/tokens/cusd.svg',
    },
    cEUR: {
      address: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73' as `0x${string}`,
      symbol: 'cEUR',
      name: 'Celo Euro',
      decimals: 18,
      logo: '/tokens/ceur.svg',
    },
    USDC: {
      address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' as `0x${string}`,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logo: '/tokens/usdc.svg',
    },
  },
} as const;

// Chain metadata
export const CHAIN_INFO = {
  [base.id]: {
    name: 'Base',
    shortName: 'base',
    color: '#0052FF',
    explorer: 'https://basescan.org',
    rpc: 'https://mainnet.base.org',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  },
  [celo.id]: {
    name: 'Celo',
    shortName: 'celo',
    color: '#FCFF52',
    explorer: 'https://celoscan.io',
    rpc: 'https://forno.celo.org',
    nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
  },
} as const;

// Supported chain IDs
export const SUPPORTED_CHAINS = [base.id, celo.id] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAINS)[number];

// Helper to check if chain is supported
export function isSupportedChain(chainId: number): chainId is SupportedChainId {
  return SUPPORTED_CHAINS.includes(chainId as SupportedChainId);
}

// Get contracts for a chain
export function getContracts(chainId: SupportedChainId) {
  return CONTRACTS[chainId];
}

// Get tokens for a chain
export function getTokens(chainId: SupportedChainId) {
  return TOKENS[chainId];
}

// Get token list as array
export function getTokenList(chainId: SupportedChainId) {
  const tokens = TOKENS[chainId];
  return Object.values(tokens);
}

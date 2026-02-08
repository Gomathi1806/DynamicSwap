import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, celo } from 'wagmi/chains';
import { http } from 'wagmi';

// RainbowKit config
export const config = getDefaultConfig({
  appName: 'DynamicSwap',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_ID || 'demo-project-id',
  chains: [base, celo],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
    [celo.id]: http('https://forno.celo.org'),
  },
  ssr: true,
});

// Re-export chains for convenience
export { base, celo };

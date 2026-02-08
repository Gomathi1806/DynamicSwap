import { http, createConfig } from 'wagmi';
import { base, celo } from 'wagmi/chains';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        rainbowWallet,
        metaMaskWallet,
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: 'DynamicSwap',
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_ID || 'demo-project-id',
  }
);

export const config = createConfig({
  connectors,
  chains: [base, celo],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
    [celo.id]: http('https://forno.celo.org'),
  },
  ssr: true,
});

// Re-export chains for convenience
export { base, celo };

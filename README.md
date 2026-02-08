# DynamicSwap - Uniswap V4 Dynamic Fee Hook dApp

A full-featured dApp for interacting with the DynamicFeeHook on Uniswap V4. Features real contract interactions, pool creation, liquidity management, and swapping with dynamic fee protection.

![DynamicSwap](https://img.shields.io/badge/Uniswap-V4-ff007a?style=flat-square)
![Base](https://img.shields.io/badge/Base-Mainnet-0052FF?style=flat-square)
![Celo](https://img.shields.io/badge/Celo-Mainnet-FCFF52?style=flat-square)

## 🌟 Features

- **Dynamic Fees**: Fees automatically adjust from 0.30% to 1.00% based on market volatility
- **LP Protection**: Higher fees during high volatility protect liquidity providers
- **Multi-Chain**: Deployed on Base and Celo mainnets
- **Real Contract Interactions**: Actual on-chain transactions, not simulated
- **Modern UI**: Built with Next.js 14, Tailwind CSS, and RainbowKit

## 📋 Deployed Contracts

### Base Mainnet
| Contract | Address |
|----------|---------|
| DynamicFeeHook | `0x2c80c5cd9fecc3e32dfaa654e022738480a4909a` |
| PoolManager | `0x498581ff718922c3f8e6a244956af099b2652b2b` |
| PositionManager | `0x7c5f5a4bbd8fd63184577525326123b519429bdc` |

### Celo Mainnet
| Contract | Address |
|----------|---------|
| DynamicFeeHook | `0xe96B2C7416596fE707ba40379B909F42F18d7FC0` |
| PoolManager | `0x288dc841A52FCA2707c6947B3A777c5E56cd87BC` |
| PositionManager | `0xf7965f3981e4d5bc383bfbcb61501763e9068ca9` |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- MetaMask or another Web3 wallet

### Installation

```bash
# Clone/download the project
cd dynamicswap-prod

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Add your WalletConnect Project ID (optional but recommended)
# Get one at https://cloud.walletconnect.com/
# Edit .env and add: NEXT_PUBLIC_WALLET_CONNECT_ID=your_id

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage Guide

### Creating Your First Pool

1. Connect your wallet (Base or Celo network)
2. Go to the "Create Pool" tab
3. Select two tokens (e.g., WETH/USDC on Base)
4. Set the initial price
5. Choose tick spacing (60 recommended for most pairs)
6. Click "Create Pool" and confirm in your wallet

**Estimated costs:**
- Base: ~$3-5 in ETH
- Celo: ~$0.10 in CELO

### Adding Liquidity

1. Go to the "Liquidity" tab
2. Select the token pair (pool must exist)
3. Enter amounts for both tokens
4. Approve tokens if needed (first time only)
5. Click "Add Liquidity" and confirm

### Swapping

1. Go to the "Swap" tab
2. Select input and output tokens
3. Enter amount to swap
4. Review the dynamic fee (updates in real-time)
5. Click "Swap" and confirm

## 🛠 CLI Scripts

For advanced users, CLI scripts are provided for pool creation and liquidity:

### Create Pool

```bash
# Create .env file with your private key
echo "PRIVATE_KEY=0x..." > .env

# Create pool on Base
npm run create-pool:base

# Create pool on Celo
npm run create-pool:celo
```

### Add Liquidity

```bash
# Add liquidity on Base (0.01 WETH + 25 USDC)
npm run add-liquidity:base -- --amount0 0.01 --amount1 25

# Add liquidity on Celo (10 CELO + 5 cUSD)
npm run add-liquidity:celo -- --amount0 10 --amount1 5
```

## 🏗 Project Structure

```
dynamicswap-prod/
├── src/
│   ├── app/                 # Next.js app router
│   │   ├── layout.tsx       # Root layout with providers
│   │   ├── page.tsx         # Main page with tabs
│   │   └── globals.css      # Global styles
│   ├── components/          # React components
│   │   ├── Header.tsx       # Wallet connection header
│   │   ├── SwapPanel.tsx    # Swap interface
│   │   ├── LiquidityPanel.tsx   # Add liquidity interface
│   │   ├── CreatePoolPanel.tsx  # Pool creation interface
│   │   ├── TokenSelector.tsx    # Token dropdown
│   │   └── Providers.tsx    # Wagmi/RainbowKit providers
│   ├── contracts/           # Contract ABIs and addresses
│   │   ├── abis.ts          # Contract ABIs
│   │   └── addresses.ts     # Deployed addresses
│   ├── hooks/               # Custom React hooks
│   │   ├── usePoolData.ts   # Pool data fetching
│   │   └── useTransactions.ts   # Transaction hooks
│   └── lib/                 # Utilities
│       ├── wagmi.ts         # Wagmi configuration
│       └── pool-utils.ts    # Pool calculations
├── scripts/                 # CLI scripts
│   ├── createPool.ts        # Pool creation script
│   └── addLiquidity.ts      # Add liquidity script
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## 💡 How Dynamic Fees Work

The DynamicFeeHook adjusts trading fees based on recent price volatility:

| Volatility | Fee |
|------------|-----|
| Low (stable) | 0.30% |
| Medium | 0.50% |
| High | 0.80% |
| Very High | 1.00% |

**Benefits:**
- LPs are protected during volatile periods (higher fees compensate for impermanent loss risk)
- Traders get lower fees during stable periods
- More sustainable LP returns over time

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_WALLET_CONNECT_ID` | WalletConnect Cloud project ID | Recommended |
| `PRIVATE_KEY` | Wallet private key (CLI scripts only) | For scripts |

### Adding New Tokens

Edit `src/contracts/addresses.ts` to add new tokens:

```typescript
TOKENS: {
  [chainId]: {
    YOUR_TOKEN: {
      address: '0x...',
      symbol: 'TOKEN',
      name: 'Your Token',
      decimals: 18,
    },
  },
}
```

## 🚢 Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect your GitHub repo to Vercel for automatic deployments.

### Build for Production

```bash
npm run build
npm run start
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- [Uniswap V4 Documentation](https://docs.uniswap.org/contracts/v4/overview)
- [Base](https://base.org)
- [Celo](https://celo.org)
- [RainbowKit](https://rainbowkit.com)
- [Wagmi](https://wagmi.sh)

---

Built with ❤️ for the DeFi community

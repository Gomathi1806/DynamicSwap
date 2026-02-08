import { encodeAbiParameters, keccak256, parseAbiParameters } from 'viem';

// Pool Key structure
export interface PoolKey {
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  fee: number;
  tickSpacing: number;
  hooks: `0x${string}`;
}

// Sort tokens (currency0 must be < currency1)
export function sortTokens(
  tokenA: `0x${string}`,
  tokenB: `0x${string}`
): [`0x${string}`, `0x${string}`] {
  // Handle native token (address 0)
  const a = tokenA.toLowerCase();
  const b = tokenB.toLowerCase();
  
  if (a < b) {
    return [tokenA, tokenB];
  }
  return [tokenB, tokenA];
}

// Calculate Pool ID from PoolKey
export function getPoolId(poolKey: PoolKey): `0x${string}` {
  const encoded = encodeAbiParameters(
    parseAbiParameters('address, address, uint24, int24, address'),
    [
      poolKey.currency0,
      poolKey.currency1,
      poolKey.fee,
      poolKey.tickSpacing,
      poolKey.hooks,
    ]
  );
  return keccak256(encoded);
}

// Convert price to sqrtPriceX96
// price = token1/token0
export function priceToSqrtPriceX96(price: number): bigint {
  const sqrtPrice = Math.sqrt(price);
  const sqrtPriceX96 = sqrtPrice * 2 ** 96;
  return BigInt(Math.floor(sqrtPriceX96));
}

// Convert sqrtPriceX96 to price
export function sqrtPriceX96ToPrice(
  sqrtPriceX96: bigint,
  decimals0: number,
  decimals1: number
): number {
  const sqrtPrice = Number(sqrtPriceX96) / 2 ** 96;
  const price = sqrtPrice * sqrtPrice;
  // Adjust for decimals
  const decimalAdjustment = 10 ** (decimals0 - decimals1);
  return price * decimalAdjustment;
}

// Convert tick to price
export function tickToPrice(
  tick: number,
  decimals0: number,
  decimals1: number
): number {
  const price = 1.0001 ** tick;
  const decimalAdjustment = 10 ** (decimals0 - decimals1);
  return price * decimalAdjustment;
}

// Convert price to tick
export function priceToTick(price: number): number {
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

// Get nearest valid tick based on tick spacing
export function nearestUsableTick(tick: number, tickSpacing: number): number {
  const rounded = Math.round(tick / tickSpacing) * tickSpacing;
  return rounded;
}

// Calculate tick range for full range liquidity
export function getFullRangeTicks(tickSpacing: number): [number, number] {
  const MIN_TICK = -887272;
  const MAX_TICK = 887272;
  
  const minTick = Math.ceil(MIN_TICK / tickSpacing) * tickSpacing;
  const maxTick = Math.floor(MAX_TICK / tickSpacing) * tickSpacing;
  
  return [minTick, maxTick];
}

// Calculate liquidity from amounts
export function getLiquidityForAmounts(
  sqrtPriceX96: bigint,
  sqrtPriceAX96: bigint,
  sqrtPriceBX96: bigint,
  amount0: bigint,
  amount1: bigint
): bigint {
  // Simplified calculation - in production use proper math
  const sqrtPrice = Number(sqrtPriceX96) / 2 ** 96;
  const sqrtPriceA = Number(sqrtPriceAX96) / 2 ** 96;
  const sqrtPriceB = Number(sqrtPriceBX96) / 2 ** 96;
  
  let liquidity0 = 0;
  let liquidity1 = 0;
  
  if (sqrtPrice <= sqrtPriceA) {
    liquidity0 = Number(amount0) * sqrtPriceA * sqrtPriceB / (sqrtPriceB - sqrtPriceA);
  } else if (sqrtPrice < sqrtPriceB) {
    liquidity0 = Number(amount0) * sqrtPrice * sqrtPriceB / (sqrtPriceB - sqrtPrice);
    liquidity1 = Number(amount1) / (sqrtPrice - sqrtPriceA);
  } else {
    liquidity1 = Number(amount1) / (sqrtPriceB - sqrtPriceA);
  }
  
  return BigInt(Math.floor(Math.min(
    liquidity0 || Number.MAX_SAFE_INTEGER,
    liquidity1 || Number.MAX_SAFE_INTEGER
  )));
}

// Format fee from contract format (hundredths of a bip) to percentage
export function formatFee(fee: number): string {
  // Fee is in hundredths of a bip (0.0001%)
  // 3000 = 0.30%
  return (fee / 10000).toFixed(2) + '%';
}

// Parse fee percentage to contract format
export function parseFee(feePercent: number): number {
  // Convert percentage to hundredths of a bip
  return Math.floor(feePercent * 10000);
}

// Dynamic fee flag
export const DYNAMIC_FEE_FLAG = 0x800000; // Bit 23 set indicates dynamic fee

// Check if fee is dynamic
export function isDynamicFee(fee: number): boolean {
  return (fee & DYNAMIC_FEE_FLAG) !== 0;
}

// Tick spacing options
export const TICK_SPACINGS = {
  LOW: 1,      // For stable pairs
  MEDIUM: 60,  // Standard
  HIGH: 200,   // For volatile pairs
} as const;

// Recommended tick spacing based on fee
export function getTickSpacing(feePercent: number): number {
  if (feePercent <= 0.05) return TICK_SPACINGS.LOW;
  if (feePercent <= 0.30) return TICK_SPACINGS.MEDIUM;
  return TICK_SPACINGS.HIGH;
}

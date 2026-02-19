// ============= Crypto: Stablecoin classification =============
export const STABLECOIN_SYMBOLS = [
  'USDT', 'USDC', 'DAI', 'FRAX', 'LUSD', 'crvUSD', 'GHO', 'PYUSD',
  'EURC', 'EURe', 'FDUSD', 'TUSD', 'USDP', 'USDbC', 'USDe', 'sUSDe', 'USDS', 'sUSDS',
  'ZCHF',
];

const stablecoinSet = new Set(STABLECOIN_SYMBOLS.map((s) => s.toLowerCase()));

// Approximate USD rates for non-USD stablecoins (used as fallback when Zerion
// returns no price). Symbols not listed here default to 1.0 (USD-pegged).
const EUR_STABLECOINS = ['eurc', 'eure'];
const CHF_STABLECOINS = ['zchf'];

const FALLBACK_USD_RATES: Record<string, number> = {
  eur: 1.04,
  chf: 1.13,
};

/**
 * Get the approximate USD value of one unit of a stablecoin.
 * Resolves the underlying stablecoin for aToken variants (aGnoEURe → EURe).
 */
export function stablecoinUsdRate(symbol: string): number {
  const lower = symbol.toLowerCase();

  // Resolve underlying symbol for aTokens
  let underlying = lower;
  if (lower.startsWith('a')) {
    const withoutA = lower.slice(1);
    // Simple aToken (aEURe → eure)
    if (stablecoinSet.has(withoutA)) {
      underlying = withoutA;
    } else {
      // Chain-prefixed (aGnoEURe → eure)
      for (const stable of stablecoinSet) {
        if (withoutA.endsWith(stable) && withoutA.length > stable.length) {
          underlying = stable;
          break;
        }
      }
    }
  }

  if (EUR_STABLECOINS.includes(underlying)) return FALLBACK_USD_RATES.eur;
  if (CHF_STABLECOINS.includes(underlying)) return FALLBACK_USD_RATES.chf;
  return 1.0;
}

/**
 * Detect Aave receipt tokens (aTokens): aUSDC, aEURe, aGnoEURe, etc.
 */
export const isAaveReceiptToken = (symbol: string): boolean => {
  const lower = symbol.toLowerCase();
  if (!lower.startsWith('a')) return false;
  const withoutA = lower.slice(1);
  if (stablecoinSet.has(withoutA)) return true;
  for (const stable of stablecoinSet) {
    if (withoutA.endsWith(stable) && withoutA.length > stable.length) return true;
  }
  return false;
};

/** Case-insensitive check.
 * Also matches Aave receipt-token variants:
 *   - Simple:       aUSDC, aEURe, aDAI, aGHO …
 *   - Chain-prefix: aGnoEURe, aArbUSDC, aOptUSDT, aPolDAI, aEthUSDC …
 */
export const isStablecoinSymbol = (symbol: string): boolean => {
  const lower = symbol.toLowerCase();
  if (stablecoinSet.has(lower)) return true;

  // Aave aToken: strip leading "a" then check
  if (lower.startsWith('a') && stablecoinSet.has(lower.slice(1))) return true;

  // Aave chain-prefixed aToken (aGnoEURe, aArbUSDC, aOptUSDT, …):
  // check if the symbol ends with a known stablecoin after the leading "a"
  if (lower.startsWith('a')) {
    const withoutA = lower.slice(1);
    for (const stable of stablecoinSet) {
      if (withoutA.endsWith(stable) && withoutA.length > stable.length) return true;
    }
  }

  return false;
};

import type { CryptoWallet, TokenPosition } from "@/schemas";

// ============================================================
// Bitcoin API using Mempool.space and CoinGecko
// ============================================================

interface MempoolAddressStats {
  address: string;
  chain_stats: {
    funded_txo_sum: number; // Total received in satoshis
    spent_txo_sum: number; // Total spent in satoshis
    tx_count: number;
  };
  mempool_stats: {
    funded_txo_sum: number;
    spent_txo_sum: number;
    tx_count: number;
  };
}

interface CoinGeckoPrice {
  bitcoin: {
    usd: number;
  };
}

/**
 * Fetch BTC balance for a single address using Mempool.space API (free, no key needed)
 */
async function fetchBtcBalance(address: string): Promise<number> {
  const url = `https://mempool.space/api/address/${address}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Mempool.space API error: ${response.status} ${response.statusText}`,
    );
  }

  const data: MempoolAddressStats = await response.json();

  // Calculate balance: received - spent (including mempool)
  const confirmedBalance =
    data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
  const mempoolBalance =
    data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum;
  const totalSatoshis = confirmedBalance + mempoolBalance;

  // Convert satoshis to BTC (1 BTC = 100,000,000 satoshis)
  return totalSatoshis / 100000000;
}

/**
 * Fetch current BTC price in USD using CoinGecko API
 * Free Demo API: https://www.coingecko.com/en/api/pricing
 * - 30 calls/min
 * - 10,000 calls/month
 *
 * @param apiKey Optional CoinGecko API key (Demo or Pro plan)
 */
async function fetchBtcPrice(apiKey?: string): Promise<number> {
  const url =
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";

  const headers: HeadersInit = {
    Accept: "application/json",
  };

  // Add API key if provided (recommended for production)
  if (apiKey) {
    headers["x-cg-demo-api-key"] = apiKey;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(
      `CoinGecko API error: ${response.status} ${response.statusText}`,
    );
  }

  const data: CoinGeckoPrice = await response.json();
  return data.bitcoin.usd;
}

/**
 * Fetch BTC position for a single Bitcoin wallet
 */
export async function fetchBitcoinPosition(
  wallet: CryptoWallet,
  btcPrice?: number,
): Promise<TokenPosition> {
  const [btcAmount, price] = await Promise.all([
    fetchBtcBalance(wallet.address),
    btcPrice !== undefined ? Promise.resolve(btcPrice) : fetchBtcPrice(),
  ]);

  return {
    id: `${wallet.id}-btc`,
    symbol: "BTC",
    name: "Bitcoin",
    amount: btcAmount,
    usdValue: btcAmount * price,
    chain: "bitcoin",
    isStablecoin: false,
    isNative: true,
    positionType: "wallet",
    walletId: wallet.id,
    iconUrl: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  };
}

/**
 * Fetch BTC positions for multiple Bitcoin wallets
 */
export async function fetchAllBitcoinPositions(
  wallets: CryptoWallet[],
): Promise<{
  positions: TokenPosition[];
  errors: Array<{ walletId: string; address: string; error: string }>;
}> {
  const positions: TokenPosition[] = [];
  const errors: Array<{ walletId: string; address: string; error: string }> =
    [];

  if (wallets.length === 0) return { positions, errors };

  // Fetch the BTC price once for all wallets to avoid one CoinGecko call per
  // address (rate limits) and to fail consistently if the price is unavailable.
  let btcPrice: number;
  try {
    btcPrice = await fetchBtcPrice();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    for (const wallet of wallets) {
      errors.push({
        walletId: wallet.id,
        address: wallet.address,
        error: message,
      });
    }
    return { positions, errors };
  }

  for (const wallet of wallets) {
    try {
      positions.push(await fetchBitcoinPosition(wallet, btcPrice));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({
        walletId: wallet.id,
        address: wallet.address,
        error: message,
      });
    }
  }

  return { positions, errors };
}

import type { CryptoWallet, TokenPosition } from '@/types';

// ============================================================
// Bitcoin API using Blockchain.com and CoinGecko
// ============================================================

interface BlockchainBalance {
  final_balance: number; // Balance in satoshis
  n_tx: number;
  total_received: number;
}

interface CoinGeckoPrice {
  bitcoin: {
    usd: number;
  };
}

/**
 * Fetch BTC balance for a single address using Blockchain.com API
 */
async function fetchBtcBalance(address: string): Promise<number> {
  const url = `https://blockchain.info/balance?active=${address}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Blockchain API error: ${response.status} ${response.statusText}`);
  }
  
  const data: Record<string, BlockchainBalance> = await response.json();
  const balance = data[address];
  
  if (!balance) {
    throw new Error(`Address ${address} not found`);
  }
  
  // Convert satoshis to BTC (1 BTC = 100,000,000 satoshis)
  return balance.final_balance / 100000000;
}

/**
 * Fetch current BTC price in USD using CoinGecko API (free, no API key needed)
 */
async function fetchBtcPrice(): Promise<number> {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
  }
  
  const data: CoinGeckoPrice = await response.json();
  return data.bitcoin.usd;
}

/**
 * Fetch BTC position for a single Bitcoin wallet
 */
export async function fetchBitcoinPosition(
  wallet: CryptoWallet,
): Promise<TokenPosition | null> {
  try {
    const [btcAmount, btcPrice] = await Promise.all([
      fetchBtcBalance(wallet.address),
      fetchBtcPrice(),
    ]);
    
    const usdValue = btcAmount * btcPrice;
    
    return {
      id: `${wallet.id}-btc`,
      symbol: 'BTC',
      name: 'Bitcoin',
      amount: btcAmount,
      usdValue,
      chain: 'bitcoin',
      isStablecoin: false,
      isNative: true,
      positionType: 'wallet',
      walletId: wallet.id,
      iconUrl: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    };
  } catch (err) {
    console.error(`Error fetching Bitcoin position for ${wallet.address}:`, err);
    return null;
  }
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
  const errors: Array<{ walletId: string; address: string; error: string }> = [];
  
  for (const wallet of wallets) {
    try {
      const position = await fetchBitcoinPosition(wallet);
      if (position) {
        positions.push(position);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ walletId: wallet.id, address: wallet.address, error: message });
    }
  }
  
  return { positions, errors };
}

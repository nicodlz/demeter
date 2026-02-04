# Bitcoin API Configuration

This document explains the APIs used for Bitcoin wallet tracking in Demeter and how to configure API keys if needed.

## APIs Used

### 1. Mempool.space (Balance Fetching)

**Purpose:** Fetch Bitcoin address balance  
**Cost:** Free, no API key needed  
**Rate Limits:** Public API, no official limit  
**Documentation:** https://mempool.space/docs/api/rest

**Endpoint:**
```
GET https://mempool.space/api/address/{address}
```

**Why Mempool.space?**
- Open source and community-run
- No registration or API key required
- Reliable and well-maintained
- Supports all Bitcoin address types (Legacy, P2SH, SegWit)
- Includes mempool (pending) transactions

**Example Response:**
```json
{
  "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  "chain_stats": {
    "funded_txo_sum": 1648906833,  // Total received (satoshis)
    "spent_txo_sum": 1287005839,    // Total spent (satoshis)
    "tx_count": 981
  },
  "mempool_stats": {
    "funded_txo_sum": 0,
    "spent_txo_sum": 0,
    "tx_count": 0
  }
}
```

Balance = (chain_stats.funded_txo_sum - chain_stats.spent_txo_sum + mempool_stats.funded_txo_sum - mempool_stats.spent_txo_sum) / 100,000,000

---

### 2. CoinGecko (BTC/USD Price)

**Purpose:** Fetch current Bitcoin price in USD  
**Cost:** Free Demo API plan (recommended) or public endpoint  
**Rate Limits:**
- **Public API (no key):** Limited, not recommended for production
- **Demo API (free):** 30 calls/min, 10,000 calls/month
- **Pro API (paid):** Higher limits

**Documentation:** https://www.coingecko.com/en/api

**Endpoint:**
```
GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd
```

**Example Response:**
```json
{
  "bitcoin": {
    "usd": 73806
  }
}
```

---

## Getting API Keys (Optional but Recommended)

### CoinGecko Demo API (Free)

The public CoinGecko API works without a key, but it's recommended to get a free Demo API key for better reliability.

**Steps:**

1. Go to https://www.coingecko.com/en/api/pricing
2. Click **"Create Free Account"** under Demo API
3. Sign up with email
4. Verify your email
5. Go to Developer Dashboard: https://www.coingecko.com/en/developers/dashboard
6. Click **"Generate API Key"**
7. Copy the API key

**Demo Plan Limits:**
- ✅ 30 calls per minute
- ✅ 10,000 calls per month
- ✅ No credit card required
- ✅ Access to all public endpoints

**Adding the Key to Demeter:**

Currently, the CoinGecko API key is not exposed in the Demeter UI. The code supports it, but you would need to:

1. Add `coinGeckoApiKey` field to `AppSettings` schema
2. Add input in Settings page
3. Pass it from `useCrypto` hook to `fetchAllBitcoinPositions`

For now, the public endpoint works fine for personal use.

---

## Current Status

✅ **Working without any API keys:**
- Mempool.space: No key needed
- CoinGecko: Public endpoint works

⚠️ **Recommended for production:**
- Get a free CoinGecko Demo API key (10k calls/month)

---

## Rate Limit Considerations

**Typical Usage (1 user, 5 Bitcoin wallets):**
- Each sync: 5 Mempool.space calls + 1 CoinGecko call = 6 API calls total
- Syncing 3x/day: 18 calls/day = ~540 calls/month
- **Well within CoinGecko Demo limits (10k/month)**

**If you hit limits:**
- Reduce sync frequency
- Cache BTC price for 5-10 minutes
- Upgrade to CoinGecko Pro API ($129/month for 500k calls)

---

## Alternative APIs (for reference)

If Mempool.space or CoinGecko become unreliable, here are alternatives:

### For Bitcoin Balance:
- **BlockCypher** (https://www.blockcypher.com) - Free tier: 200 req/hour with API key
- **Blockchair** (https://blockchair.com/api) - Free tier: 1,440 req/day
- **Blockchain.com** (https://blockchain.info) - Public API, no key

### For BTC Price:
- **CoinMarketCap** (https://coinmarketcap.com/api) - Free tier: 10k calls/month
- **Binance** (https://binance-docs.github.io/apidocs) - Public API, high limits
- **Kraken** (https://docs.kraken.com/api) - Public API, no key

---

## Testing

Test the APIs directly:

```bash
# Test Mempool.space (replace with your address)
curl "https://mempool.space/api/address/bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"

# Test CoinGecko (public endpoint)
curl "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"

# Test with API key (if you have one)
curl -H "x-cg-demo-api-key: YOUR_KEY_HERE" \
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
```

---

## Troubleshooting

### "Mempool.space API error: 429"
- You're hitting rate limits
- Wait a few minutes before syncing again
- Consider implementing a cache

### "CoinGecko API error: 429"
- Get a free Demo API key (10k calls/month)
- Or reduce sync frequency

### "Invalid Bitcoin address"
- Demeter supports: Legacy (1...), P2SH (3...), SegWit (bc1...)
- Make sure the address is valid
- Use a block explorer to verify: https://mempool.space

---

## Future Improvements

Potential enhancements:

1. **Add CoinGecko API key field in Settings UI**
2. **Cache BTC price for 5-10 minutes** to reduce API calls
3. **Support for other cryptocurrencies** (ETH, SOL native balance)
4. **Historical price data** for portfolio performance tracking
5. **Multi-currency support** (EUR, GBP, etc.)

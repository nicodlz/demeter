import type { CryptoWallet, TokenPosition } from '@/types';
import { isStablecoinSymbol, stablecoinUsdRate, isAaveReceiptToken } from '@/utils/constants';

/**
 * Resolve an Aave receipt token symbol to its underlying stablecoin.
 * e.g. "aGnoEURe" → "eure", "aUSDC" → "usdc"
 */
function resolveAaveUnderlying(symbol: string): string {
  const lower = symbol.toLowerCase();
  if (!lower.startsWith('a')) return lower;
  const withoutA = lower.slice(1);

  // Import the stablecoin set indirectly via isStablecoinSymbol — but we need
  // the raw resolved symbol. Re-derive here for simplicity.
  // Simple: aEURe → eure
  if (isStablecoinSymbol(withoutA)) return withoutA;

  // Chain-prefixed: aGnoEURe → strip chain prefix, return last matching stable
  // We try progressively shorter suffixes.
  for (let i = 1; i < withoutA.length; i++) {
    const suffix = withoutA.slice(i);
    if (isStablecoinSymbol(suffix)) return suffix;
  }

  return lower;
}

// ============================================================
// Zerion REST API types (JSON:API response format)
// ============================================================

interface ZerionFungibleInfo {
  name: string;
  symbol: string;
  icon?: { url: string } | null;
  implementations?: Array<{
    chain_id: string;
    address: string | null;
  }>;
}

interface ZerionPositionAttributes {
  parent: null | string;
  protocol: string | null;
  name: string;
  position_type: 'wallet' | 'deposit' | 'staked' | 'reward' | 'locked' | 'liquidity';
  quantity: {
    int: string;
    decimals: number;
    float: number;
    numeric: string;
  };
  value: number | null;
  price: number;
  changes: Record<string, unknown> | null;
  fungible_info: ZerionFungibleInfo;
  flags: {
    displayable: boolean;
    is_trash: boolean;
  };
  updated_at: string;
  updated_at_block: number;
}

interface ZerionRelationshipChain {
  data: {
    type: string;
    id: string;
  };
}

interface ZerionPositionData {
  type: string;
  id: string;
  attributes: ZerionPositionAttributes;
  relationships: {
    chain: ZerionRelationshipChain;
  };
}

interface ZerionApiResponse {
  links: { self: string; next?: string };
  data: ZerionPositionData[];
}

// ============================================================
// API helpers
// ============================================================

const ZERION_BASE_URL = import.meta.env.VITE_PROXY_URL
  ? `${import.meta.env.VITE_PROXY_URL}/zerion`
  : 'https://api.zerion.io';

const PROXY_KEY = import.meta.env.VITE_PROXY_KEY ?? '';

function makeAuthHeader(apiKey: string): string {
  return `Basic ${btoa(apiKey + ':')}`;
}

function makeHeaders(apiKey: string): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: makeAuthHeader(apiKey),
    Accept: 'application/json',
  };
  if (PROXY_KEY) h['X-Proxy-Key'] = PROXY_KEY;
  return h;
}

export class ZerionApiError extends Error {
  status: number;
  statusText: string;

  constructor(message: string, status: number, statusText: string) {
    super(message);
    this.name = 'ZerionApiError';
    this.status = status;
    this.statusText = statusText;
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Fetch all positions for a single wallet address.
 * Handles pagination automatically.
 */
export async function fetchWalletPositions(
  address: string,
  apiKey: string,
): Promise<ZerionPositionData[]> {
  const allPositions: ZerionPositionData[] = [];
  let url: string | undefined =
    `${ZERION_BASE_URL}/v1/wallets/${address}/positions/?filter[positions]=no_filter&currency=usd`;

  while (url) {
    // Rewrite pagination URLs through proxy if needed
    const fetchUrl = ZERION_BASE_URL !== 'https://api.zerion.io' && url.startsWith('https://api.zerion.io')
      ? url.replace('https://api.zerion.io', ZERION_BASE_URL)
      : url;

    const response = await fetch(fetchUrl, {
      headers: makeHeaders(apiKey),
    });

    if (!response.ok) {
      throw new ZerionApiError(
        `Zerion API error for ${address}: ${response.status} ${response.statusText}`,
        response.status,
        response.statusText,
      );
    }

    const json: ZerionApiResponse = await response.json();
    allPositions.push(...json.data);
    url = json.links.next;
  }

  return allPositions;
}

/**
 * Map a raw Zerion position to our normalized TokenPosition type.
 */
function mapPosition(
  raw: ZerionPositionData,
  walletId: string,
): TokenPosition {
  const attrs = raw.attributes;
  const symbol = attrs.fungible_info.symbol;
  const chainId = raw.relationships.chain.data.id;

  // Detect native tokens (ETH, SOL, MATIC, etc.)
  const isNative =
    attrs.fungible_info.implementations?.some(
      (impl) => impl.address === null,
    ) ?? false;

  const isStablecoin = isStablecoinSymbol(symbol);
  let usdValue = attrs.value ?? 0;

  // Fallback: if Zerion reports no value for a known stablecoin, convert the
  // raw amount to USD using the appropriate fiat rate (EUR, CHF, or USD).
  if (isStablecoin && usdValue === 0 && attrs.quantity.float > 0) {
    usdValue = attrs.quantity.float * stablecoinUsdRate(symbol);
  }

  return {
    id: `${walletId}-${raw.id}`,
    symbol,
    name: attrs.fungible_info.name,
    amount: attrs.quantity.float,
    usdValue,
    chain: chainId,
    isStablecoin,
    isNative,
    positionType: attrs.position_type,
    protocol: attrs.protocol ?? undefined,
    walletId,
    iconUrl: attrs.fungible_info.icon?.url ?? undefined,
  };
}

export interface AggregatedPortfolio {
  positions: TokenPosition[];
  totalCryptoValue: number;
  totalStablecoinValue: number;
  errors: Array<{ walletId: string; address: string; error: string }>;
}

/**
 * Fetch and aggregate positions across multiple wallets.
 * Continues on per-wallet errors so partial data is still returned.
 */
export async function fetchAllWalletsPositions(
  wallets: CryptoWallet[],
  apiKey: string,
): Promise<AggregatedPortfolio> {
  const allPositions: TokenPosition[] = [];
  const errors: AggregatedPortfolio['errors'] = [];

  for (const wallet of wallets) {
    try {
      const rawPositions = await fetchWalletPositions(wallet.address, apiKey);
      const mapped = rawPositions
        .filter((p) => p.attributes.flags.displayable && !p.attributes.flags.is_trash)
        .map((p) => mapPosition(p, wallet.id));
      allPositions.push(...mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ walletId: wallet.id, address: wallet.address, error: message });
    }
  }

  // Deduplicate: remove aToken receipt tokens (wallet type) when a
  // corresponding DeFi position (deposit/staked) already exists for the
  // same underlying token, to avoid double-counting.
  const defiKeys = new Set(
    allPositions
      .filter((p) => p.positionType !== 'wallet')
      .map((p) => `${p.walletId}-${p.symbol.toLowerCase()}-${p.chain}`),
  );
  const deduped = allPositions.filter((p) => {
    if (p.positionType !== 'wallet' || !isAaveReceiptToken(p.symbol)) return true;
    // This is an aToken wallet position — check if a DeFi position exists
    // for the same underlying on the same chain & wallet
    const underlying = resolveAaveUnderlying(p.symbol);
    return !defiKeys.has(`${p.walletId}-${underlying}-${p.chain}`);
  });

  const totalCryptoValue = deduped
    .filter((p) => !p.isStablecoin)
    .reduce((sum, p) => sum + p.usdValue, 0);

  const totalStablecoinValue = deduped
    .filter((p) => p.isStablecoin)
    .reduce((sum, p) => sum + p.usdValue, 0);

  return { positions: deduped, totalCryptoValue, totalStablecoinValue, errors };
}

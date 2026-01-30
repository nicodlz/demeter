import type { CryptoWallet, TokenPosition } from '@/types';
import { isStablecoinSymbol } from '@/utils/constants';

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

function makeAuthHeader(apiKey: string): string {
  return `Basic ${btoa(apiKey + ':')}`;
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
    `https://api.zerion.io/v1/wallets/${address}/positions/?filter[positions]=no_filter&currency=usd`;

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: makeAuthHeader(apiKey),
        Accept: 'application/json',
      },
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

  return {
    id: `${walletId}-${raw.id}`,
    symbol,
    name: attrs.fungible_info.name,
    amount: attrs.quantity.float,
    usdValue: attrs.value ?? 0,
    chain: chainId,
    isStablecoin: isStablecoinSymbol(symbol),
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

  const totalCryptoValue = allPositions
    .filter((p) => !p.isStablecoin)
    .reduce((sum, p) => sum + p.usdValue, 0);

  const totalStablecoinValue = allPositions
    .filter((p) => p.isStablecoin)
    .reduce((sum, p) => sum + p.usdValue, 0);

  return { positions: allPositions, totalCryptoValue, totalStablecoinValue, errors };
}

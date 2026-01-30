import { z } from 'zod';

export const cryptoWalletSchema = z.object({
  id: z.string(),
  label: z.string(),
  address: z.string(),
  createdAt: z.string(),
});

export const tokenPositionSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  amount: z.number(),
  usdValue: z.number(),
  chain: z.string(),
  isStablecoin: z.boolean(),
  isNative: z.boolean(),
  positionType: z.enum(['wallet', 'deposit', 'staked', 'reward', 'locked', 'liquidity']),
  protocol: z.string().optional(),
  walletId: z.string(),
  iconUrl: z.string().optional(),
});

export type CryptoWallet = z.infer<typeof cryptoWalletSchema>;
export type TokenPosition = z.infer<typeof tokenPositionSchema>;

import { COIN_PRICE_PER_TRY, COIN_MIN_PURCHASE, COIN_MAX_PURCHASE, COIN_BONUS_TIERS } from './constants';

export interface CoinPurchaseResult {
  amountTRY: number;
  baseCoins: number;
  bonusPercent: number;
  bonusCoins: number;
  totalCoins: number;
}

export function calculateCoinPurchase(amountTRY: number): CoinPurchaseResult {
  const clamped = Math.max(COIN_MIN_PURCHASE, Math.min(COIN_MAX_PURCHASE, Math.floor(amountTRY)));
  const baseCoins = clamped * COIN_PRICE_PER_TRY;

  let bonusPercent = 0;
  for (const tier of COIN_BONUS_TIERS) {
    if (clamped >= tier.minTRY) {
      bonusPercent = tier.bonusPercent;
      break;
    }
  }

  const bonusCoins = Math.floor(baseCoins * bonusPercent / 100);

  return {
    amountTRY: clamped,
    baseCoins,
    bonusPercent,
    bonusCoins,
    totalCoins: baseCoins + bonusCoins,
  };
}

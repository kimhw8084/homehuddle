import {
  getWalletChartPoints,
  getWalletChartIndex,
  getWalletTabWidth,
  parseRewardExpiry,
  resolveEffectiveReward,
} from '../utils/wallet-logic';

const now = new Date(2026, 8, 26, 12, 0, 0);

function reward(status: 'active' | 'used' | 'expired', expiresDate: string | null) {
  return { status, expiresDate };
}

describe('Wallet reward expiry authority', () => {
  it('keeps an active reward with a future expiry actionable', () => {
    expect(resolveEffectiveReward(reward('active', 'Sep 30'), now)).toMatchObject({
      status: 'active',
      actionable: true,
      expiry: { kind: 'valid' },
    });
  });

  it('moves an active reward with an elapsed expiry to nonactionable history', () => {
    expect(resolveEffectiveReward(reward('active', 'Sep 25, 2026'), now)).toMatchObject({
      status: 'expired',
      actionable: false,
      expiry: { kind: 'valid' },
    });
  });

  it('honors an explicit expired status even when its expiry is future', () => {
    expect(resolveEffectiveReward(reward('expired', 'Sep 30, 2026'), now)).toMatchObject({
      status: 'expired',
      actionable: false,
    });
  });

  it('keeps used rewards historical when their expiry is in the past', () => {
    expect(resolveEffectiveReward(reward('used', '2025-03-14'), now)).toMatchObject({
      status: 'used',
      actionable: false,
    });
  });

  it('keeps gifted rewards historical and nonactionable', () => {
    expect(resolveEffectiveReward({ status: 'gifted', expiresDate: null }, now)).toMatchObject({
      status: 'gifted',
      actionable: false,
    });
  });

  it('preserves an honest active state for an invalid expiry', () => {
    expect(resolveEffectiveReward(reward('active', 'not a real date'), now)).toMatchObject({
      status: 'active',
      actionable: true,
      expiry: { kind: 'invalid', at: null },
    });
    expect(parseRewardExpiry('Feb 30, 2025', now)).toEqual({ kind: 'invalid', at: null });
  });

  it('interprets month and day strings in the current UI year', () => {
    const expiry = parseRewardExpiry('Sun, Mar 14', now);
    expect(expiry.kind).toBe('valid');
    if (expiry.kind === 'valid') {
      expect(new Date(expiry.at).getFullYear()).toBe(2026);
      expect(new Date(expiry.at).getFullYear()).not.toBe(2001);
    }
  });

  it('preserves the explicit year and time in ISO expiry values', () => {
    const expiry = parseRewardExpiry('2025-03-14T12:00:00.000Z', now);
    expect(expiry.kind).toBe('valid');
    if (expiry.kind === 'valid') expect(new Date(expiry.at).toISOString()).toBe('2025-03-14T12:00:00.000Z');
  });
});

describe('Wallet live responsive geometry', () => {
  it('recomputes chart coordinates from the measured container width', () => {
    const data = [10, 20, 15];
    const mobile = getWalletChartPoints(data, 310, 140, 10, 20);
    const desktop = getWalletChartPoints(data, 960, 140, 10, 20);

    expect(mobile[2].x).toBe(310);
    expect(desktop[2].x).toBe(960);
    expect(mobile[1].y).toBe(desktop[1].y);
    expect(getWalletChartIndex(150, 300, 30)).toBe(15);
    expect(getWalletChartIndex(150, 900, 30)).toBe(5);
  });

  it('recomputes each switcher half from its measured outer width', () => {
    expect(getWalletTabWidth(342)).toBe(166);
    expect(getWalletTabWidth(1392)).toBe(691);
    expect(getWalletTabWidth(1392)).not.toBe(getWalletTabWidth(342));
  });
});

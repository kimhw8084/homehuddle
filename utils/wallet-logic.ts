export type RewardStatus = 'active' | 'used' | 'expired' | 'gifted';

type RewardLike = {
  status: RewardStatus;
  expiresDate: string | null;
};

export type RewardExpiry =
  | { kind: 'none'; at: null }
  | { kind: 'invalid'; at: null }
  | { kind: 'valid'; at: number };

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAY = '(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\\.?';

function endOfLocalDay(year: number, month: number, day: number): number | null {
  const date = new Date(year, month, day, 23, 59, 59, 999);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return date.getTime();
}

function monthIndex(value: string): number {
  return MONTHS.findIndex(month => month === value.slice(0, 3).toLowerCase());
}

export function parseRewardExpiry(value: string | null, now: Date = new Date()): RewardExpiry {
  if (!value) return { kind: 'none', at: null };

  const relative = value.match(/^(Today|Yesterday|Tomorrow)$/i);
  if (relative) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (relative[1].toLowerCase() === 'yesterday') date.setDate(date.getDate() - 1);
    if (relative[1].toLowerCase() === 'tomorrow') date.setDate(date.getDate() + 1);
    return { kind: 'valid', at: endOfLocalDay(date.getFullYear(), date.getMonth(), date.getDate())! };
  }

  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    const at = endOfLocalDay(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
    return at === null ? { kind: 'invalid', at: null } : { kind: 'valid', at };
  }

  const isoDateTime = value.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoDateTime) {
    const [year, month, day] = isoDateTime.slice(1).map(Number);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));
    if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) {
      return { kind: 'invalid', at: null };
    }
    const at = new Date(value).getTime();
    return Number.isFinite(at) ? { kind: 'valid', at } : { kind: 'invalid', at: null };
  }

  const noYear = value.match(new RegExp(`^(?:${WEEKDAY},?\\s*)?([A-Za-z]+)\\s+(\\d{1,2})$`, 'i'));
  const withYear = value.match(new RegExp(`^(?:${WEEKDAY},?\\s*)?([A-Za-z]+)\\s+(\\d{1,2}),?\\s+(\\d{4})$`, 'i'));
  const monthAndDay = noYear ?? withYear;
  if (monthAndDay) {
    const month = monthIndex(monthAndDay[1]);
    const day = Number(monthAndDay[2]);
    const year = withYear ? Number(withYear[3]) : now.getFullYear();
    const at = month < 0 ? null : endOfLocalDay(year, month, day);
    return at === null ? { kind: 'invalid', at: null } : { kind: 'valid', at };
  }

  const numericDate = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (numericDate) {
    const at = endOfLocalDay(Number(numericDate[3]), Number(numericDate[1]) - 1, Number(numericDate[2]));
    return at === null ? { kind: 'invalid', at: null } : { kind: 'valid', at };
  }

  return { kind: 'invalid', at: null };
}

export function resolveEffectiveReward(
  reward: RewardLike,
  now: Date = new Date(),
): { status: RewardStatus; expiry: RewardExpiry; actionable: boolean } {
  const expiry = parseRewardExpiry(reward.expiresDate, now);
  if (reward.status !== 'active') {
    return { status: reward.status, expiry, actionable: false };
  }
  const status = expiry.kind === 'valid' && expiry.at <= now.getTime() ? 'expired' : 'active';
  return { status, expiry, actionable: status === 'active' };
}

export function getWalletChartPoints(data: number[], width: number, height: number, top: number, bottom: number) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(max - min, 1);
  return data.map((value, index) => ({
    x: (index / Math.max(1, data.length - 1)) * width,
    y: top + (1 - (value - min) / range) * (height - top - bottom),
    v: value,
  }));
}

export function getWalletChartIndex(locationX: number, width: number, dataLength: number): number {
  if (width <= 0 || dataLength <= 1) return 0;
  const clamped = Math.max(0, Math.min(width, locationX));
  return Math.min(dataLength - 1, Math.max(0, Math.round((clamped / width) * (dataLength - 1))));
}

export function getWalletTabWidth(switcherWidth: number): number {
  return Math.max(0, (switcherWidth - 10) / 2);
}

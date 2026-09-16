// ─── Core helpers ────────────────────────────────────────────────────────────

export const getLocalFormattedDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const getTodayStr = () => getLocalFormattedDate(new Date());

export const getDDay = (dateStr: string) => {
  const todayStr = getTodayStr();
  if (dateStr === todayStr) return 'Today';
  const today = parseLocalDate(todayStr).getTime();
  const target = parseLocalDate(dateStr).getTime();
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  return `in ${diff}d`;
};

export const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
export const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

export const isUSFederalHoliday = (date: Date) => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (month === 1 && day === 1) return "New Year's";
  if (month === 12 && day === 25) return 'Christmas';
  return null;
};

export const ORDINALS: Record<string, number> = { First: 1, Second: 2, Third: 3, Fourth: 4, Last: -1 };
const ORDINAL_DAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Integer epoch-day arithmetic ────────────────────────────────────────────
// Work in "epoch days" (ms / 86400000) to avoid repeated string↔Date conversions.

const MS_PER_DAY = 86400000;

/** Date → integer epoch day (UTC-midnight aligned; uses local year/month/day) */
const dateToEpochDay = (d: Date): number =>
  Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY;

/** "YYYY-MM-DD" → integer epoch day */
const strToEpochDay = (s: string): number => {
  const y = +s.slice(0, 4), m = +s.slice(5, 7) - 1, d = +s.slice(8, 10);
  return Date.UTC(y, m, d) / MS_PER_DAY;
};

/** Integer epoch day → "YYYY-MM-DD" */
const epochDayToStr = (n: number): string => {
  const d = new Date(n * MS_PER_DAY);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
};

/** Integer epoch day → { year, month(0-based), day, dow(0=Sun) } */
const epochDayParts = (n: number) => {
  const d = new Date(n * MS_PER_DAY);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), dow: d.getUTCDay() };
};

// ─── Rule parsing (cached) ────────────────────────────────────────────────────

type ParsedRule =
  | { kind: 'daily'; interval: number; maxCount: number; untilDay: number }
  | { kind: 'weekly'; interval: number; days: number[]; maxCount: number; untilDay: number }
  | { kind: 'monthly-day'; interval: number; days: number[]; maxCount: number; untilDay: number }
  | { kind: 'monthly-pos'; interval: number; ordinal: number; dow: number; maxCount: number; untilDay: number }
  | { kind: 'monthly-simple'; interval: number; maxCount: number; untilDay: number }
  | { kind: 'yearly-month'; interval: number; months: number[]; maxCount: number; untilDay: number }
  | { kind: 'yearly-pos'; interval: number; months: number[]; ordinal: number; dow: number; maxCount: number; untilDay: number }
  | { kind: 'yearly-simple'; interval: number; maxCount: number; untilDay: number }
  | { kind: 'unknown' };

const ruleCache = new Map<string, ParsedRule>();

/** Extract COUNT and UNTIL from raw rule string. Returns maxCount (-1 = unlimited) and untilDay (-1 = unlimited). */
const extractLimits = (rule: string): { maxCount: number; untilDay: number } => {
  const countMatch = rule.match(/;COUNT=(\d+)/);
  const untilMatch = rule.match(/;UNTIL=(\d{8})/);
  const maxCount = countMatch ? parseInt(countMatch[1], 10) : -1;
  let untilDay = -1;
  if (untilMatch) {
    const s = untilMatch[1];
    const y = +s.slice(0, 4), m = +s.slice(4, 6) - 1, d = +s.slice(6, 8);
    untilDay = Date.UTC(y, m, d) / MS_PER_DAY;
  }
  return { maxCount, untilDay };
};

const parseRule = (rule: string): ParsedRule => {
  const cached = ruleCache.get(rule);
  if (cached) return cached;

  let r: ParsedRule;
  const { maxCount, untilDay } = extractLimits(rule);
  const base = rule.replace(/;COUNT=\d+/,'').replace(/;UNTIL=\d{8}/,'');

  if (base === 'Every Day')      { r = { kind: 'daily', interval: 1, maxCount, untilDay }; }
  else if (base === 'Every Week') { r = { kind: 'weekly', interval: 1, days: [], maxCount, untilDay }; }
  else if (base === 'Every 2 Weeks') { r = { kind: 'weekly', interval: 2, days: [], maxCount, untilDay }; }
  else if (base === 'Every Month') { r = { kind: 'monthly-simple', interval: 1, maxCount, untilDay }; }
  else if (base === 'Every Year') { r = { kind: 'yearly-simple', interval: 1, maxCount, untilDay }; }
  else {
    const params: Record<string, string> = {};
    base.split(';').forEach(p => { const [k, v] = p.split('='); if (k && v) params[k] = v; });
    const freq = params['FREQ'] ?? 'Weekly';
    const interval = parseInt(params['INTERVAL'] ?? '1', 10);

    if (freq === 'Daily') {
      r = { kind: 'daily', interval, maxCount, untilDay };
    } else if (freq === 'Weekly') {
      const days = params['BYDAY']
        ? params['BYDAY'].split(',').map(s => ORDINAL_DAYS[s.trim()] ?? -1).filter(n => n >= 0).sort((a,b)=>a-b)
        : [];
      r = { kind: 'weekly', interval, days, maxCount, untilDay };
    } else if (freq === 'Monthly') {
      if (params['BYMONTHDAY']) {
        const days = params['BYMONTHDAY'].split(',').map(Number).sort((a,b)=>a-b);
        r = { kind: 'monthly-day', interval, days, maxCount, untilDay };
      } else if (params['BYSETPOS'] && params['BYDAY']) {
        r = { kind: 'monthly-pos', interval, ordinal: parseInt(params['BYSETPOS'],10), dow: ORDINAL_DAYS[params['BYDAY'].trim()] ?? 0, maxCount, untilDay };
      } else {
        r = { kind: 'monthly-simple', interval, maxCount, untilDay };
      }
    } else if (freq === 'Yearly') {
      if (params['BYMONTH'] && params['BYSETPOS'] && params['BYDAY']) {
        const months = params['BYMONTH'].split(',').map(m => MONTH_NAMES.indexOf(m.trim())).filter(m=>m>=0).sort((a,b)=>a-b);
        r = { kind: 'yearly-pos', interval, months, ordinal: parseInt(params['BYSETPOS'],10), dow: ORDINAL_DAYS[params['BYDAY'].trim()] ?? 0, maxCount, untilDay };
      } else if (params['BYMONTH']) {
        const months = params['BYMONTH'].split(',').map(m => MONTH_NAMES.indexOf(m.trim())).filter(m=>m>=0).sort((a,b)=>a-b);
        r = { kind: 'yearly-month', interval, months, maxCount, untilDay };
      } else {
        r = { kind: 'yearly-simple', interval, maxCount, untilDay };
      }
    } else {
      r = { kind: 'unknown' };
    }
  }

  ruleCache.set(rule, r);
  return r;
};

// ─── Next-occurrence using epoch-day integers (no string parsing in hot path) ─

/** Returns the next epoch day after `fromDay` according to parsed rule, or -1 */
const nextEpochDay = (fromDay: number, pr: ParsedRule, startDay: number): number => {
  switch (pr.kind) {
    case 'daily':
      return fromDay + pr.interval;

    case 'weekly': {
      if (pr.days.length === 0) return fromDay + 7 * pr.interval;
      const next = fromDay + 1;
      const { dow } = epochDayParts(next);
      // Find the next matching day-of-week within this or future weeks
      for (let offset = 0; offset < 14 * pr.interval; offset++) {
        const candidate = next + offset;
        const candidateDow = (dow + offset) % 7;
        if (pr.days.includes(candidateDow)) {
          // Check interval alignment: weeks since start
          const weekDiff = Math.floor((candidate - startDay) / 7);
          if (weekDiff % pr.interval === 0) return candidate;
        }
      }
      return -1;
    }

    case 'monthly-day': {
      const fd = epochDayParts(fromDay);
      for (let monthOffset = 0; monthOffset <= pr.interval + 1; monthOffset++) {
        const ty = fd.y + Math.floor((fd.m + monthOffset) / 12);
        const tm = (fd.m + monthOffset) % 12;
        const daysInM = new Date(ty, tm + 1, 0).getDate();
        const monthDiff = monthOffset; // diff from fromDay's month
        if (monthDiff % pr.interval !== 0 && monthOffset !== 0) continue;
        for (const day of pr.days) {
          if (day < 1 || day > daysInM) continue;
          const candidate = dateToEpochDay(new Date(ty, tm, day));
          if (candidate > fromDay) return candidate;
        }
      }
      return -1;
    }

    case 'monthly-pos': {
      const fd = epochDayParts(fromDay);
      for (let mo = 1; mo <= pr.interval + 2; mo++) {
        const ty = fd.y + Math.floor((fd.m + mo) / 12);
        const tm = (fd.m + mo) % 12;
        const daysInM = new Date(ty, tm + 1, 0).getDate();
        const occurrences: number[] = [];
        for (let day = 1; day <= daysInM; day++) {
          const ep = dateToEpochDay(new Date(ty, tm, day));
          if (epochDayParts(ep).dow === pr.dow) occurrences.push(ep);
        }
        const idx = pr.ordinal === -1 ? occurrences.length - 1 : pr.ordinal - 1;
        const candidate = occurrences[idx];
        if (candidate !== undefined && candidate > fromDay) {
          const monthDiff = (ty - fd.y) * 12 + (tm - fd.m);
          if (monthDiff % pr.interval === 0) return candidate;
        }
      }
      return -1;
    }

    case 'monthly-simple': {
      const fd = epochDayParts(fromDay);
      const ty = fd.y + Math.floor((fd.m + pr.interval) / 12);
      const tm = (fd.m + pr.interval) % 12;
      return dateToEpochDay(new Date(ty, tm, fd.d));
    }

    case 'yearly-month': {
      const fd = epochDayParts(fromDay);
      for (let yr = 0; yr <= pr.interval + 1; yr++) {
        for (const mo of pr.months) {
          const candidate = dateToEpochDay(new Date(fd.y + yr, mo, fd.d));
          if (candidate > fromDay && (fd.y + yr - epochDayParts(dateToEpochDay(new Date(fd.y,0,1))).y) % pr.interval === 0) return candidate;
        }
      }
      return -1;
    }

    case 'yearly-pos': {
      const fd = epochDayParts(fromDay);
      for (let yr = 0; yr <= pr.interval + 1; yr++) {
        for (const mo of pr.months) {
          const ty = fd.y + yr;
          const daysInM = new Date(ty, mo + 1, 0).getDate();
          const occurrences: number[] = [];
          for (let day = 1; day <= daysInM; day++) {
            const ep = dateToEpochDay(new Date(ty, mo, day));
            if (epochDayParts(ep).dow === pr.dow) occurrences.push(ep);
          }
          const idx = pr.ordinal === -1 ? occurrences.length - 1 : pr.ordinal - 1;
          const candidate = occurrences[idx];
          if (candidate !== undefined && candidate > fromDay && (ty - fd.y) % pr.interval === 0) return candidate;
        }
      }
      return -1;
    }

    case 'yearly-simple': {
      const fd = epochDayParts(fromDay);
      return dateToEpochDay(new Date(fd.y + pr.interval, fd.m, fd.d));
    }

    default:
      return -1;
  }
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns the next occurrence date after fromDateStr, or undefined if the rule
 * has ended (COUNT exhausted or UNTIL passed).
 *
 * `occurrenceIndex` = 1-based index of `fromDateStr` in the series (1 = first occurrence).
 * Pass it when you know it so COUNT can be enforced without re-counting from scratch.
 */
export const computeNextDate = (
  fromDateStr: string,
  rule?: string,
  occurrenceIndex?: number,
): string | undefined => {
  if (!rule) return undefined;
  const pr = parseRule(rule);
  if (pr.kind === 'unknown') return undefined;

  const fromDay = strToEpochDay(fromDateStr);

  // Enforce UNTIL
  if (pr.untilDay > 0 && fromDay >= pr.untilDay) return undefined;

  // Enforce COUNT: if occurrenceIndex is known, check directly
  if (pr.maxCount > 0 && occurrenceIndex !== undefined) {
    if (occurrenceIndex >= pr.maxCount) return undefined;
  }

  const next = nextEpochDay(fromDay, pr, fromDay);
  if (next < 0) return undefined;

  // Enforce UNTIL on the next date too
  if (pr.untilDay > 0 && next > pr.untilDay) return undefined;

  return epochDayToStr(next);
};

/**
 * Count how many occurrences of the rule exist from (exclusive) startDateStr
 * up to (inclusive) targetDateStr. Used to determine if COUNT is exhausted.
 */
export const countOccurrencesBetween = (
  startDateStr: string,
  rule: string,
  targetDateStr: string,
): number => {
  const pr = parseRule(rule);
  if (pr.kind === 'unknown') return 0;
  const startDay = strToEpochDay(startDateStr);
  const targetDay = strToEpochDay(targetDateStr);
  let cursor = startDay;
  let count = 0;
  for (let safety = 0; safety < 10000; safety++) {
    const next = nextEpochDay(cursor, pr, startDay);
    if (next < 0 || next > targetDay) break;
    count++;
    cursor = next;
  }
  return count;
};

/**
 * Fill `acc` with all occurrence date-strings for `rule` starting after `startDateStr`
 * that fall within [windowStartStr, windowEndStr]. Extremely fast — no string parsing
 * inside the hot loop, O(1) jump to window start.
 */
export const fillOccurrencesInWindow = (
  startDateStr: string,
  rule: string,
  windowStartStr: string,
  windowEndStr: string,
  acc: Record<string, boolean>
): void => {
  const pr = parseRule(rule);
  if (pr.kind === 'unknown') return;

  const startDay = strToEpochDay(startDateStr);
  const winStart = strToEpochDay(windowStartStr);
  const winEnd = strToEpochDay(windowEndStr);

  if (startDay >= winEnd) return;

  // Apply UNTIL cap
  const effectiveEnd = pr.untilDay > 0 ? Math.min(winEnd, pr.untilDay) : winEnd;
  if (effectiveEnd < winStart) return;

  // O(1) fast-forward: estimate period in days, jump directly to just before window
  let cursor = startDay;
  const periodEstimate = (() => {
    switch (pr.kind) {
      case 'daily': return pr.interval;
      case 'weekly': return 7 * pr.interval;
      case 'monthly-day': case 'monthly-pos': case 'monthly-simple': return 30 * pr.interval;
      case 'yearly-month': case 'yearly-pos': case 'yearly-simple': return 365 * pr.interval;
      default: return 7;
    }
  })();

  // For COUNT, we must walk from the very start to count properly.
  // Only do the fast-forward if there's no COUNT limit (or the window is small enough).
  let occurrenceCount = 0; // occurrences emitted so far from startDay
  const useCountTracking = pr.maxCount > 0;

  if (!useCountTracking && cursor < winStart && periodEstimate > 0) {
    const gap = winStart - cursor;
    const jumpDays = Math.max(0, Math.floor(gap / periodEstimate) - 1) * periodEstimate;
    // Jump by raw days (safe for daily/weekly; monthly/yearly will self-correct in next loop)
    if (pr.kind === 'daily' || pr.kind === 'weekly') {
      cursor += jumpDays;
    } else if (pr.kind === 'monthly-simple' || pr.kind === 'monthly-day' || pr.kind === 'monthly-pos') {
      const fd = epochDayParts(startDay);
      const months = Math.max(0, Math.floor((winStart - startDay) / 30) - 2) * pr.interval;
      const ty = fd.y + Math.floor((fd.m + months) / 12);
      const tm = (fd.m + months) % 12;
      cursor = dateToEpochDay(new Date(ty, tm, fd.d));
      if (cursor > winStart) cursor = startDay; // safety
    } else if (pr.kind === 'yearly-simple' || pr.kind === 'yearly-month' || pr.kind === 'yearly-pos') {
      const fd = epochDayParts(startDay);
      const years = Math.max(0, Math.floor((winStart - startDay) / 365) - 1) * pr.interval;
      cursor = dateToEpochDay(new Date(fd.y + years, fd.m, fd.d));
      if (cursor > winStart) cursor = startDay;
    }
  }

  // Walk through window — typically ≤200 iterations for any rule/window combo
  for (let safety = 0; safety < 400; safety++) {
    const next = nextEpochDay(cursor, pr, startDay);
    if (next < 0 || next > effectiveEnd) break;
    occurrenceCount++;
    if (useCountTracking && occurrenceCount > pr.maxCount) break;
    if (next >= winStart) acc[epochDayToStr(next)] = true;
    cursor = next;
  }
};

/**
 * Returns true if a recurring chore occurs on targetDateStr.
 * O(1) jump + ≤20 steps.
 */
export const recurringOccursOn = (startDateStr: string, rule: string, targetDateStr: string): boolean => {
  if (!rule || !startDateStr) return false;
  const pr = parseRule(rule);
  if (pr.kind === 'unknown') return false;

  const startDay = strToEpochDay(startDateStr);
  const targetDay = strToEpochDay(targetDateStr);
  if (startDay >= targetDay) return false;

  // Check UNTIL
  if (pr.untilDay > 0 && targetDay > pr.untilDay) return false;

  // For COUNT, we need to count from start to see if we've hit the limit
  if (pr.maxCount > 0) {
    const dummy: Record<string, boolean> = {};
    fillOccurrencesInWindow(startDateStr, rule, startDateStr, targetDateStr, dummy);
    return dummy[targetDateStr] === true;
  }

  // O(1) fast-forward (no COUNT limit)
  const dummy: Record<string, boolean> = {};
  const oneDayBefore = epochDayToStr(targetDay - 1);
  fillOccurrencesInWindow(startDateStr, rule, oneDayBefore, targetDateStr, dummy);
  return dummy[targetDateStr] === true;
};

// Keep legacy export for any callers
export const fastForwardToNear = (startDateStr: string, _rule: string, _targetDateStr: string): string => startDateStr;

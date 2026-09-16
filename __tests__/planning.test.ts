import { addDays, startOfWeek } from '../features/planning/dates';

describe('household calendar dates', () => {
  it('uses Monday as the first day including Sunday input', () => {
    expect(startOfWeek(new Date('2026-09-13T12:00:00'))).toBe('2026-09-07');
    expect(startOfWeek(new Date('2026-09-14T12:00:00'))).toBe('2026-09-14');
  });
  it('crosses leap days, years and daylight saving boundaries as calendar days', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
  });
});

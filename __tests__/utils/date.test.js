import {
  getISTDateString,
  getISTMonthYear,
  getPreviousMonthYear,
  getISTDayOfWeek,
  isISTSunday,
  formatDate
} from '../../utils/date';

describe('Frontend Date Utilities', () => {
  describe('getISTDateString', () => {
    it('formats a UTC ISO string into Asia/Kolkata YYYY-MM-DD', () => {
      // 2026-08-14T18:30:00Z is 2026-08-15 00:00:00 IST
      const utcDate = new Date('2026-08-14T18:30:00.000Z');
      expect(getISTDateString(utcDate)).toBe('2026-08-15');
    });

    it('returns original trimmed string if already in YYYY-MM-DD format', () => {
      expect(getISTDateString(' 2026-11-03 ')).toBe('2026-11-03');
    });

    it('returns empty string for invalid inputs', () => {
      expect(getISTDateString(null)).toBe('');
      expect(getISTDateString('not-a-date')).toBe('');
    });
  });

  describe('getISTMonthYear', () => {
    it('extracts year and 1-based month accurately', () => {
      const { year, month } = getISTMonthYear('2026-11-03');
      expect(year).toBe(2026);
      expect(month).toBe(11);
    });
  });

  describe('getPreviousMonthYear', () => {
    it('returns previous month for normal months', () => {
      const { year, month } = getPreviousMonthYear('2026-11-03');
      expect(year).toBe(2026);
      expect(month).toBe(10);
    });

    it('wraps to previous year and December when given January', () => {
      const { year, month } = getPreviousMonthYear('2026-01-15');
      expect(year).toBe(2025);
      expect(month).toBe(12);
    });
  });

  describe('isISTSunday', () => {
    it('returns true for Sunday in IST and false for weekdays', () => {
      expect(isISTSunday('2026-11-01')).toBe(true);  // Sunday
      expect(isISTSunday('2026-11-02')).toBe(false); // Monday
      expect(isISTSunday('2026-11-03')).toBe(false); // Tuesday
    });

    it('handles falsy input safely', () => {
      expect(isISTSunday(null)).toBe(false);
      expect(isISTSunday(undefined)).toBe(false);
    });
  });

  describe('getISTDayOfWeek', () => {
    it('returns weekday name in English', () => {
      expect(getISTDayOfWeek('2026-11-01')).toBe('Sunday');
      expect(getISTDayOfWeek('2026-11-02')).toBe('Monday');
      expect(getISTDayOfWeek('2026-11-03')).toBe('Tuesday');
    });
  });

  describe('formatDate', () => {
    it('formats YYYY-MM-DD to DD-MM-YYYY', () => {
      expect(formatDate('2026-11-03')).toBe('03-11-2026');
    });

    it('handles empty input gracefully', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate(null)).toBe('');
    });
  });
});


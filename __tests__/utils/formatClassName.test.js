import formatClassName from '../../utils/formatClassName';

describe('formatClassName Utility', () => {
  it('formats raw numeric grade to Grade - X', () => {
    expect(formatClassName('1')).toBe('Grade - 1');
    expect(formatClassName('10')).toBe('Grade - 10');
  });

  it('formats grade with section', () => {
    expect(formatClassName('1', 'A')).toBe('Grade - 1 A');
    expect(formatClassName('10', 'B')).toBe('Grade - 10 B');
  });

  it('supports compact display mode (1st Class, 10th Class)', () => {
    expect(formatClassName('1', { compact: true })).toBe('1st Class');
    expect(formatClassName('10', 'A', { compact: true })).toBe('10th Class A');
  });

  it('handles object input with name and section properties', () => {
    expect(formatClassName({ name: '5', section: 'B' })).toBe('Grade - 5 B');
    expect(formatClassName({ label: 'Class 8', section: 'C' })).toBe('Grade - 8 C');
  });

  it('preserves pre-primary keywords', () => {
    expect(formatClassName('LKG')).toBe('LKG');
    expect(formatClassName('UKG', 'A')).toBe('UKG A');
    expect(formatClassName('Nursery')).toBe('Nursery');
  });

  it('handles empty or null inputs gracefully', () => {
    expect(formatClassName('')).toBe('');
    expect(formatClassName(null)).toBe('');
    expect(formatClassName(undefined)).toBe('');
  });
});


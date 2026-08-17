import { ExerciseDisplayNamePipe } from './exercise-display-name.pipe';

describe('ExerciseDisplayNamePipe', () => {
  let pipe: ExerciseDisplayNamePipe;

  beforeEach(() => {
    pipe = new ExerciseDisplayNamePipe();
  });

  it('should return name only when no brand', () => {
    expect(pipe.transform('Bench Press', null)).toBe('Bench Press');
    expect(pipe.transform('Bench Press', undefined)).toBe('Bench Press');
    expect(pipe.transform('Bench Press', '')).toBe('Bench Press');
    expect(pipe.transform('Bench Press', '  ')).toBe('Bench Press');
  });

  it('should return name with brand in parentheses', () => {
    expect(pipe.transform('Lat Pulldown', 'Neutral Grip')).toBe('Lat Pulldown (Neutral Grip)');
  });

  it('should trim brand whitespace', () => {
    expect(pipe.transform('Lat Pulldown', '  Neutral Grip  ')).toBe('Lat Pulldown (Neutral Grip)');
  });

  it('should return empty string for null/undefined name', () => {
    expect(pipe.transform(null, 'Brand')).toBe('');
    expect(pipe.transform(undefined, 'Brand')).toBe('');
  });
});

import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats an exercise's display name with optional brand/grip info.
 * Usage: {{ exerciseName | exerciseDisplayName:equipmentBrand }}
 * Output: "Lat Pulldown (Neutral Grip)" or just "Lat Pulldown" if no brand.
 */
@Pipe({ name: 'exerciseDisplayName', standalone: true })
export class ExerciseDisplayNamePipe implements PipeTransform {
  transform(name: string | undefined | null, brand: string | undefined | null): string {
    if (!name) return '';
    if (!brand || !brand.trim()) return name;
    return `${name} (${brand.trim()})`;
  }
}

/**
 * Generate all PWA icon PNGs from SVG source.
 * 
 * This script creates "any" purpose icons at all required sizes,
 * plus "maskable" variants at 192 and 512 with safe-zone padding.
 * 
 * Usage: node scripts/generate-icons.js
 */
const sharp = require('sharp');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');

/** SVG template for regular (any purpose) icons. */
function createRegularSvg(size) {
  const rx = Math.round(size * 0.2);
  const fontSize = Math.round(size * 0.22);
  const x = Math.round(size * 0.08);
  const y = Math.round(size * 0.28);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="#ffffff"/>
  <text x="${x}" y="${y}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="#111827">Yes</text>
</svg>`);
}

/** SVG template for maskable icons (extra safe-zone padding, no rounded corners). */
function createMaskableSvg(size) {
  const inset = Math.round(size * 0.15);
  const innerSize = size - inset * 2;
  const fontSize = Math.round(innerSize * 0.22);
  const x = inset + Math.round(innerSize * 0.08);
  const y = inset + Math.round(fontSize * 1.15);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#ffffff"/>
  <text x="${x}" y="${y}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="#111827">Yes</text>
</svg>`);
}

/** SVG template for monochrome icons (transparent background, for Android/Apple themes). */
function createMonochromeSvg(size) {
  const innerSize = size * 0.8; // 80% safe zone for monochrome
  const padding = size * 0.1;
  const fontSize = Math.round(innerSize * 0.25);
  const x = padding + Math.round(innerSize * 0.08);
  const y = padding + Math.round(fontSize * 1.15);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <text x="${x}" y="${y}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">Yes</text>
</svg>`);
}

async function main() {
  const regularSizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const maskableSizes = [192, 512];

  console.log('Generating regular icons...');
  for (const size of regularSizes) {
    const outPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
    await sharp(createRegularSvg(size)).png().toFile(outPath);
    console.log(`  ok ${path.basename(outPath)}`);
  }

  console.log('Generating maskable icons...');
  for (const size of maskableSizes) {
    const outPath = path.join(ICONS_DIR, `icon-${size}x${size}-maskable.png`);
    await sharp(createMaskableSvg(size)).png().toFile(outPath);
    console.log(`  ok ${path.basename(outPath)}`);
  }

  console.log('Generating monochrome icons...');
  for (const size of maskableSizes) {
    const outPath = path.join(ICONS_DIR, `icon-${size}x${size}-monochrome.png`);
    await sharp(createMonochromeSvg(size)).png().toFile(outPath);
    console.log(`  ok ${path.basename(outPath)}`);
  }

  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });

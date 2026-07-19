# Generate PWA icons from SVG source
# Creates all required sizes for regular and maskable icons

$ICONS_DIR = "public/icons"
$TEMP_DIR = "public/icons/temp"

New-Item -ItemType Directory -Path $TEMP_DIR -Force | Out-Null

# Regular icon sizes - based on icon.svg (512x512 viewBox)
$sizes = @(72, 96, 128, 144, 152, 192, 384, 512)

foreach ($size in $sizes) {
    $name = "icon-${size}x${size}"
    # Create temp SVG at exact pixel size
    $rx = [math]::Round($size * 0.2)
    $fontSize = [math]::Round($size * 0.234)
    $x = [math]::Round($size * 0.078)
    $y = [math]::Round($size * 0.273)
    $svg = @"
<svg xmlns="http://www.w3.org/2000/svg" width="$size" height="$size" viewBox="0 0 $size $size">
  <rect width="$size" height="$size" rx="$rx" fill="#ffffff"/>
  <text x="30" y="145" font-family="Inter, Arial, Helvetica, sans-serif" font-size="110" font-weight="700" fill="#111827">Yes</text>
</svg>
"@
    Set-Content -Path "$TEMP_DIR/$name.svg" -Value $svg -NoNewline
    npx -y sharp-cli -i "$TEMP_DIR/$name.svg" -o $ICONS_DIR -f png 2>&1 | Out-Null
    Write-Host "  ok $name.png"
}

# Maskable icons (192 and 512) - extra padding, no rounded corners
$maskSizes = @(192, 512)

foreach ($size in $maskSizes) {
    $name = "icon-${size}x${size}-maskable"
    $inset = [math]::Round($size * 0.15)
    $innerSize = $size - $inset * 2
    $fontSize = [math]::Round($innerSize * 0.22)
    $tx = $inset + [math]::Round($innerSize * 0.08)
    $ty = $inset + [math]::Round($fontSize * 1.15)
    $svg = @"
<svg xmlns="http://www.w3.org/2000/svg" width="$size" height="$size" viewBox="0 0 $size $size">
  <rect width="$size" height="$size" fill="#ffffff"/>
  <text x="30" y="145" font-family="Inter, Arial, Helvetica, sans-serif" font-size="110" font-weight="700" fill="#111827">Yes</text>
</svg>
"@
    Set-Content -Path "$TEMP_DIR/$name.svg" -Value $svg -NoNewline
    npx -y sharp-cli -i "$TEMP_DIR/$name.svg" -o $ICONS_DIR -f png 2>&1 | Out-Null
    Write-Host "  ok $name.png"
}

# Clean up temp directory
Remove-Item -Recurse -Force $TEMP_DIR
Write-Host "Done!"

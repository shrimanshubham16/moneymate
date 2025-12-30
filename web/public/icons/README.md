# PWA Icons

This directory should contain the following icon files for PWA support:

- `icon-16x16.png` - Favicon
- `icon-32x32.png` - Favicon
- `icon-72x72.png` - Android icon
- `icon-96x96.png` - Android icon
- `icon-128x128.png` - Android icon
- `icon-144x144.png` - Android icon
- `icon-152x152.png` - iOS icon
- `icon-192x192.png` - Android icon (required)
- `icon-384x384.png` - Android splash
- `icon-512x512.png` - Android splash (required)

## Creating Icons

You can use an online tool like:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator
- https://www.appicon.co/

Or create them from a 512x512 source image using ImageMagick:

```bash
# Install ImageMagick if needed
# brew install imagemagick (macOS)
# apt-get install imagemagick (Linux)

# Create all sizes from a 512x512 source
convert source-icon.png -resize 16x16 icon-16x16.png
convert source-icon.png -resize 32x32 icon-32x32.png
convert source-icon.png -resize 72x72 icon-72x72.png
convert source-icon.png -resize 96x96 icon-96x96.png
convert source-icon.png -resize 128x128 icon-128x128.png
convert source-icon.png -resize 144x144 icon-144x144.png
convert source-icon.png -resize 152x152 icon-152x152.png
convert source-icon.png -resize 192x192 icon-192x192.png
convert source-icon.png -resize 384x384 icon-384x384.png
convert source-icon.png -resize 512x512 icon-512x512.png
```

## Temporary Placeholder

For now, you can use a simple colored square or the FinFlow logo as a placeholder.
The icons will be generated properly before production deployment.



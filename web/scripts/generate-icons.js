#!/usr/bin/env node

/**
 * Generate PWA Icons for FinFlow
 * Creates all required icon sizes from a base design
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon sizes required for PWA
const ICON_SIZES = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

// FinFlow brand colors
const COLORS = {
  primary: '#00d4ff',      // Cyan accent
  secondary: '#8b5cf6',    // Purple accent
  background: '#0a0a0a',   // Dark background
  text: '#ffffff'          // White text
};

// Create SVG icon
function createSVGIcon(size) {
  const center = size / 2;
  const fontSize = size * 0.3;
  const iconSize = size * 0.6;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${COLORS.secondary};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="${COLORS.background}" rx="${size * 0.15}"/>
  
  <!-- Chart/Flow Icon (simplified) -->
  <g transform="translate(${center}, ${center})">
    <!-- Upward trending line -->
    <path d="M -${iconSize * 0.3} ${iconSize * 0.2} L -${iconSize * 0.15} ${iconSize * 0.1} L 0 ${iconSize * 0.15} L ${iconSize * 0.15} ${iconSize * 0.05} L ${iconSize * 0.3} -${iconSize * 0.1}" 
          stroke="url(#grad)" 
          stroke-width="${size * 0.08}" 
          fill="none" 
          stroke-linecap="round" 
          stroke-linejoin="round"/>
    
    <!-- Data points -->
    <circle cx="-${iconSize * 0.3}" cy="${iconSize * 0.2}" r="${size * 0.04}" fill="${COLORS.primary}"/>
    <circle cx="-${iconSize * 0.15}" cy="${iconSize * 0.1}" r="${size * 0.04}" fill="${COLORS.primary}"/>
    <circle cx="0" cy="${iconSize * 0.15}" r="${size * 0.04}" fill="${COLORS.primary}"/>
    <circle cx="${iconSize * 0.15}" cy="${iconSize * 0.05}" r="${size * 0.04}" fill="${COLORS.primary}"/>
    <circle cx="${iconSize * 0.3}" cy="-${iconSize * 0.1}" r="${size * 0.04}" fill="${COLORS.primary}"/>
  </g>
  
  <!-- FinFlow text (only for larger icons) -->
  ${size >= 192 ? `
  <text x="${center}" y="${size * 0.85}" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold" 
        fill="${COLORS.text}" 
        text-anchor="middle" 
        opacity="0.9">FF</text>
  ` : ''}
</svg>`;
}

// Convert SVG to PNG using sharp (if available) or create SVG files
async function generateIcons() {
  const iconsDir = path.join(__dirname, '../public/icons');
  
  // Create icons directory if it doesn't exist
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  console.log('🎨 Generating PWA icons for FinFlow...\n');
  
  // Check if sharp is available for PNG conversion
  let sharp;
  try {
    sharp = (await import('sharp')).default;
    console.log('✅ Using sharp for PNG conversion\n');
  } catch (e) {
    console.log('⚠️  sharp not found. Generating SVG icons instead.\n');
    console.log('💡 Install sharp for PNG generation: npm install --save-dev sharp\n');
  }
  
  for (const size of ICON_SIZES) {
    const svg = createSVGIcon(size);
    const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
    
    // Save SVG
    fs.writeFileSync(svgPath, svg);
    
    // Convert to PNG if sharp is available
    if (sharp) {
      try {
        const pngPath = path.join(iconsDir, `icon-${size}x${size}.png`);
        await sharp(Buffer.from(svg))
          .png()
          .resize(size, size)
          .toFile(pngPath);
        console.log(`✅ Generated icon-${size}x${size}.png`);
      } catch (error) {
        console.error(`❌ Failed to generate PNG for ${size}x${size}:`, error.message);
        console.log(`   SVG saved at: icon-${size}x${size}.svg`);
      }
    } else {
      console.log(`📄 Generated icon-${size}x${size}.svg (install sharp for PNG)`);
    }
  }
  
  console.log('\n✨ Icon generation complete!');
  
  if (!sharp) {
    console.log('\n📝 Next steps:');
    console.log('1. Install sharp: npm install --save-dev sharp');
    console.log('2. Run this script again to generate PNG files');
    console.log('3. Or use an online SVG to PNG converter');
    console.log('4. Or use ImageMagick: convert icon-512x512.svg icon-512x512.png');
  }
}

// Run the generator
generateIcons().catch(console.error);





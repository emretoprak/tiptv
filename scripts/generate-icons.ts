import sharp from 'sharp';
import { mkdir, access, writeFile } from 'fs/promises';
import { join } from 'path';

interface IconConfig {
  size: number;
  name: string;
  path: string;
}

const iconConfigs: IconConfig[] = [
  // Desktop - PNG icons
  { size: 32, name: '32x32.png', path: 'src-tauri/icons' },
  { size: 128, name: '128x128.png', path: 'src-tauri/icons' },
  { size: 256, name: '128x128@2x.png', path: 'src-tauri/icons' },
  { size: 256, name: 'icon.png', path: 'src-tauri/icons' },
  
  // macOS - .icns (1024x1024 for best quality)
  { size: 1024, name: 'icon.icns', path: 'src-tauri/icons' },
  
  // Windows - .ico will be generated separately with multiple sizes
  
  // Windows Store - Square Icons
  { size: 1240, name: 'Square310x310Logo.png', path: 'src-tauri/icons' },
  { size: 1136, name: 'Square284x284Logo.png', path: 'src-tauri/icons' },
  { size: 600, name: 'Square150x150Logo.png', path: 'src-tauri/icons' },
  { size: 568, name: 'Square142x142Logo.png', path: 'src-tauri/icons' },
  { size: 428, name: 'Square107x107Logo.png', path: 'src-tauri/icons' },
  { size: 356, name: 'Square89x89Logo.png', path: 'src-tauri/icons' },
  { size: 284, name: 'Square71x71Logo.png', path: 'src-tauri/icons' },
  { size: 176, name: 'Square44x44Logo.png', path: 'src-tauri/icons' },
  { size: 120, name: 'Square30x30Logo.png', path: 'src-tauri/icons' },
  
  // Windows Store - Store Logo
  { size: 200, name: 'StoreLogo.png', path: 'src-tauri/icons' },
  
  // iOS - App Icons (all required sizes)
  { size: 1024, name: 'AppIcon-1024x1024.png', path: 'src-tauri/icons' },
  { size: 180, name: 'AppIcon-60x60@3x.png', path: 'src-tauri/icons' },
  { size: 120, name: 'AppIcon-60x60@2x.png', path: 'src-tauri/icons' },
  { size: 167, name: 'AppIcon-83.5x83.5@2x.png', path: 'src-tauri/icons' },
  { size: 152, name: 'AppIcon-76x76@2x.png', path: 'src-tauri/icons' },
  { size: 76, name: 'AppIcon-76x76.png', path: 'src-tauri/icons' },
  { size: 80, name: 'AppIcon-40x40@2x.png', path: 'src-tauri/icons' },
  { size: 120, name: 'AppIcon-40x40@3x.png', path: 'src-tauri/icons' },
  { size: 58, name: 'AppIcon-29x29@2x.png', path: 'src-tauri/icons' },
  { size: 87, name: 'AppIcon-29x29@3x.png', path: 'src-tauri/icons' },
  { size: 40, name: 'AppIcon-20x20@2x.png', path: 'src-tauri/icons' },
  { size: 60, name: 'AppIcon-20x20@3x.png', path: 'src-tauri/icons' },
  
  // Android - Adaptive Icons (mipmap densities)
  { size: 162, name: 'mipmap-mdpi/ic_launcher.png', path: 'src-tauri/gen/android/app/src/main/res' },
  { size: 216, name: 'mipmap-hdpi/ic_launcher.png', path: 'src-tauri/gen/android/app/src/main/res' },
  { size: 324, name: 'mipmap-xhdpi/ic_launcher.png', path: 'src-tauri/gen/android/app/src/main/res' },
  { size: 432, name: 'mipmap-xxhdpi/ic_launcher.png', path: 'src-tauri/gen/android/app/src/main/res' },
  { size: 648, name: 'mipmap-xxxhdpi/ic_launcher.png', path: 'src-tauri/gen/android/app/src/main/res' },
  
  // Android - Foreground Icons
  { size: 162, name: 'mipmap-mdpi/ic_launcher_foreground.png', path: 'src-tauri/gen/android/app/src/main/res' },
  { size: 216, name: 'mipmap-hdpi/ic_launcher_foreground.png', path: 'src-tauri/gen/android/app/src/main/res' },
  { size: 324, name: 'mipmap-xhdpi/ic_launcher_foreground.png', path: 'src-tauri/gen/android/app/src/main/res' },
  { size: 432, name: 'mipmap-xxhdpi/ic_launcher_foreground.png', path: 'src-tauri/gen/android/app/src/main/res' },
  { size: 648, name: 'mipmap-xxxhdpi/ic_launcher_foreground.png', path: 'src-tauri/gen/android/app/src/main/res' },
  
  // PWA / Web - Public folder icons
  { size: 180, name: 'apple-touch-icon.png', path: 'public' },
  { size: 192, name: 'logo-192.png', path: 'public' },
  { size: 512, name: 'logo-512.png', path: 'public' },
];

async function ensureDir(dirPath: string): Promise<void> {
  try {
    await access(dirPath);
  } catch {
    await mkdir(dirPath, { recursive: true });
  }
}

async function generateIcons(): Promise<void> {
  const svgPath = 'public/logo.svg';

  console.log('🎨 Starting icon generation...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const config of iconConfigs) {
    const dirPath = config.path;
    const fileName = config.name;
    const fullPath = join(dirPath, fileName);
    
    // Ensure directory exists
    const fileDir = fullPath.substring(0, fullPath.lastIndexOf('/'));
    await ensureDir(fileDir);
    
    try {
      if (fileName.endsWith('.icns')) {
        // For macOS, we'll generate PNG and let Tauri handle the conversion
        const pngBuffer = await sharp(svgPath)
          .resize(config.size, config.size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer();
        await writeFile(fullPath, pngBuffer);
      } else {
        // Regular PNG generation
        await sharp(svgPath)
          .resize(config.size, config.size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toFile(fullPath);
      }
      
      console.log(`✅ ${fileName} (${config.size}x${config.size})`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${fileName} could not be created:`, error);
      errorCount++;
    }
  }

  // Generate Windows ICO file with multiple sizes
  try {
    await generateWindowsIco(svgPath, 'src-tauri/icons/icon.ico');
    console.log(`✅ icon.ico (multi-size)`);
    successCount++;
  } catch (error) {
    console.error(`❌ icon.ico could not be created:`, error);
    errorCount++;
  }

  console.log(`\n🎉 Process completed!`);
  console.log(`✅ Successful: ${successCount}`);
  if (errorCount > 0) {
    console.log(`❌ Failed: ${errorCount}`);
  }
}

// Generate Windows ICO file with multiple sizes
async function generateWindowsIco(svgPath: string, outputPath: string): Promise<void> {
  const sizes = [16, 32, 48, 64, 128, 256];
  const images: Buffer[] = [];
  
  // Generate PNG buffers for each size
  for (const size of sizes) {
    const pngBuffer = await sharp(svgPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
    images.push(pngBuffer);
  }
  
  // Create ICO file with multiple images
  const icoBuffer = await createMultiSizeIco(images, sizes);
  await writeFile(outputPath, icoBuffer);
}

// Create ICO file with multiple sizes
async function createMultiSizeIco(images: Buffer[], sizes: number[]): Promise<Buffer> {
  const numImages = images.length;
  
  // ICO file header (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);           // Reserved (must be 0)
  header.writeUInt16LE(1, 2);           // Image type (1 = ICO)
  header.writeUInt16LE(numImages, 4);   // Number of images

  // Calculate directory entries and data offset
  const dirEntrySize = 16;
  const dataOffset = 6 + (numImages * dirEntrySize);
  
  // Create directory entries
  const dirEntries: Buffer[] = [];
  let currentOffset = dataOffset;
  
  for (let i = 0; i < numImages; i++) {
    const size = sizes[i];
    const imageData = images[i];
    
    const dirEntry = Buffer.alloc(dirEntrySize);
    dirEntry.writeUInt8(size === 256 ? 0 : size, 0);  // Width (0 means 256)
    dirEntry.writeUInt8(size === 256 ? 0 : size, 1);  // Height (0 means 256)
    dirEntry.writeUInt8(0, 2);                         // Color palette (0 = no palette)
    dirEntry.writeUInt8(0, 3);                         // Reserved
    dirEntry.writeUInt16LE(1, 4);                      // Color planes
    dirEntry.writeUInt16LE(32, 6);                     // Bits per pixel
    dirEntry.writeUInt32LE(imageData.length, 8);       // Image data size
    dirEntry.writeUInt32LE(currentOffset, 12);         // Offset to image data
    
    dirEntries.push(dirEntry);
    currentOffset += imageData.length;
  }
  
  // Combine all parts
  return Buffer.concat([header, ...dirEntries, ...images]);
}

generateIcons().catch(console.error);

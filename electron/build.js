const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building Electron files...');

try {
  // Ensure dist-electron directory exists
  const distDir = path.join(__dirname, '..', 'dist-electron');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Compile TypeScript
  console.log('Compiling TypeScript files...');
  execSync('npx tsc -p tsconfig.node.json', { stdio: 'inherit' });
  
  // Verify files were created
  const mainPath = path.join(distDir, 'main.js');
  const preloadPath = path.join(distDir, 'preload.js');
  
  if (fs.existsSync(mainPath)) {
    console.log('✓ main.js compiled successfully');
  } else {
    console.error('✗ main.js not found!');
  }
  
  if (fs.existsSync(preloadPath)) {
    console.log('✓ preload.js compiled successfully');
  } else {
    console.error('✗ preload.js not found!');
  }
  
  console.log('Build complete!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

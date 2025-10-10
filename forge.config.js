const path = require('path');

module.exports = {
  packagerConfig: {
    name: 'Loan Management System',
    appId: 'com.wmfcorp.loanmanagement',
    asar: true,
    overwrite: true,
    out: 'out',
    ignore: [
      /^\/src$/,
      /^\/electron$/,
      /^\/\.git$/,
      /^\/node_modules\/\.cache$/,
      /^\/\.vscode$/,
      /^\/\.idea$/,
      /^\/\.gitignore$/,
      /^\/\.eslintrc/,
      /^\/tsconfig.*\.json$/,
      /^\/vite\.config\.(ts|js)$/,
      /^\/postcss\.config\.js$/,
      /^\/tailwind\.config\.js$/,
      /^\/README.*\.md$/,
      /^\/forge\.config\.js$/,
      /^\/release/,
      /^\/release-new/,
      /^\/build$/,
      /\.ts$/,
      /\.tsx$/,
      /\.map$/,
      /\.log$/
    ],
    extraResource: [
      'electron/database/schema.sql'
    ]
  },
  rebuildConfig: {
    force: true
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'LoanManagementSystem',
        authors: 'WMF Corp',
        exe: 'Loan Management System.exe',
        setupExe: 'LoanManagementSystemSetup.exe',
        noMsi: true
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32']
    }
  ],
  hooks: {
    prePackage: async (forgeConfig, platform, arch) => {
      console.log('Pre-package hook started for', platform, arch);
      const { execSync } = require('child_process');
      const fs = require('fs-extra');
      
      try {
        // Build React app first
        console.log('Building React app...');
        execSync('npm run build', { stdio: 'inherit' });
        
        // Compile main and preload
        console.log('Compiling Electron files...');
        execSync('npx tsc electron/main.ts --outDir dist-electron --module commonjs --target es2019 --esModuleInterop --skipLibCheck', { stdio: 'inherit' });
        execSync('npx tsc electron/preload.ts --outDir dist-electron --module commonjs --target es2019 --esModuleInterop --skipLibCheck', { stdio: 'inherit' });
        
        // Compile services with correct import handling
        console.log('Compiling services...');
        const servicesDir = path.join(__dirname, 'electron/services');
        const outServicesDir = path.join(__dirname, 'dist-electron/services');
        
        await fs.ensureDir(outServicesDir);
        
        const serviceFiles = await fs.readdir(servicesDir);
        for (const file of serviceFiles) {
          if (file.endsWith('.ts')) {
            const baseName = path.basename(file, '.ts');
            try {
              execSync(`npx tsc electron/services/${file} --outDir dist-electron/services --module commonjs --target es2019 --esModuleInterop --skipLibCheck`, { stdio: 'pipe' });
            } catch (e) {
              // If TypeScript fails, try to use existing JS file if available
              const jsFile = path.join(servicesDir, baseName + '.js');
              if (await fs.pathExists(jsFile)) {
                console.log(`Using existing JS file for ${baseName}`);
                await fs.copy(jsFile, path.join(outServicesDir, baseName + '.js'));
              }
            }
          }
        }
        
        // Compile database service
        console.log('Compiling database service...');
        const dbDir = path.join(__dirname, 'dist-electron/database');
        await fs.ensureDir(dbDir);
        
        try {
          execSync('npx tsc electron/database/database.service.ts --outDir dist-electron/database --module commonjs --target es2019 --esModuleInterop --skipLibCheck', { stdio: 'pipe' });
        } catch (e) {
          // Use existing JS file if available
          const dbJsFile = path.join(__dirname, 'electron/database/database.service.js');
          if (await fs.pathExists(dbJsFile)) {
            console.log('Using existing database.service.js');
            await fs.copy(dbJsFile, path.join(dbDir, 'database.service.js'));
          }
        }
        
        // Copy utils
        console.log('Copying utils...');
        const utilsDir = path.join(__dirname, 'dist-electron/utils');
        await fs.ensureDir(utilsDir);
        
        const utilJsFile = path.join(__dirname, 'electron/utils/hash-password.js');
        if (await fs.pathExists(utilJsFile)) {
          await fs.copy(utilJsFile, path.join(utilsDir, 'hash-password.js'));
        }
        
        console.log('Pre-package hook completed');
        
      } catch (error) {
        console.error('Error in pre-package hook:', error.message);
        // Continue anyway - the JS files might already exist
      }
    }
  }
};

# 📦 Installation & Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **npm** 9.x or higher (comes with Node.js)
- **Windows 10/11** (64-bit)

## Initial Setup

### 1. Install Dependencies

Open a terminal in the project root and run:

```bash
npm install
```

This will install all required packages including:
- React, TypeScript, Vite
- Electron and build tools
- Database (SQLite) drivers
- UI libraries (TailwindCSS)

**Note**: The installation may take 3-5 minutes as it needs to compile native modules (better-sqlite3) for Electron.

### 2. Verify Installation

Check that everything is installed correctly:

```bash
npm list electron react better-sqlite3
```

You should see version numbers for each package.

## Running the Application

### Development Mode

To run the app in development mode with hot-reload:

```bash
npm run electron:dev
```

This will:
1. Start the Vite dev server (React frontend)
2. Launch Electron with the app
3. Enable DevTools for debugging

The database will be created automatically at:
```
C:\Users\{YourUsername}\AppData\Roaming\loan-management-system\loan-management.db
```

### First Login

1. When the app opens, you'll see the login screen
2. Use the default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
3. You'll be prompted to change the password immediately

## Building for Production

To create a standalone Windows installer:

```bash
npm run electron:build
```

This will:
1. Compile TypeScript
2. Build the React app
3. Package Electron with all dependencies
4. Create an installer in the `release/` folder

The installer will be named something like:
```
release/Loan Management System Setup 1.0.0.exe
```

### Installing on End-User Machines

1. Copy the `.exe` installer to the target machine
2. Double-click to run the installer
3. Follow the installation wizard (Next → Next → Install)
4. Launch the app from the Start Menu or Desktop shortcut

**No additional dependencies required** - the installer includes everything!

## Troubleshooting

### "Module not found" errors

Run:
```bash
npm install
```

### Database locked

Close all instances of the app and restart.

### Build fails with "better-sqlite3" error

The native module needs to be rebuilt for Electron:

```bash
npm run postinstall
```

If that doesn't work:
```bash
npm install --force
```

### Electron window doesn't open

Check if port 5173 is available (used by Vite dev server):

```bash
netstat -ano | findstr :5173
```

If occupied, kill the process or change the port in `vite.config.ts`.

### DevTools won't open

In development mode, DevTools should open automatically. If not, press `Ctrl + Shift + I` in the Electron window.

## Directory Structure

```
loan-management-system/
├── electron/               # Electron main process
│   ├── main.ts            # App entry point
│   ├── preload.ts         # Secure bridge to renderer
│   ├── database/          # SQLite schema & service
│   └── services/          # Auth, Users, Config
├── src/                   # React frontend (renderer)
│   ├── components/        # Reusable UI components
│   ├── pages/             # Application pages
│   ├── stores/            # Zustand state management
│   └── lib/               # Utilities
├── dist/                  # Built frontend (ignored)
├── dist-electron/         # Built Electron (ignored)
├── release/               # Production installers (ignored)
└── package.json
```

## Database Management

### Backup

The database is a single file at:
```
%APPDATA%\loan-management-system\loan-management.db
```

To backup:
1. Close the app
2. Copy the `.db` file to a safe location

### Restore

1. Close the app
2. Replace the `.db` file with your backup
3. Restart the app

### Reset to Defaults

1. Close the app
2. Delete the `.db` file
3. Restart the app (new database will be created)

## Development Tips

### Hot Reload

In development mode, changes to React components are hot-reloaded instantly. For Electron main process changes, the window will restart.

### DevTools

- **Frontend**: `Ctrl + Shift + I`
- **Backend logs**: Check the terminal running `npm run electron:dev`

### Database Inspection

Use a SQLite browser like [DB Browser for SQLite](https://sqlitebrowser.org/) to inspect the database while the app is closed.

## Next Steps

After successful installation:

1. ✅ Login with default credentials
2. ✅ Change admin password
3. ✅ Navigate to **Settings** to configure:
   - Credit limit
   - Interest rate
   - Lender/Borrower information
4. ✅ Create additional users (if needed)
5. ✅ Start creating disbursements!

## Support

For technical issues:
- Check the logs in the terminal
- Review the database state
- Consult the [README.md](README.md) for architecture details

---

**Ready to go! 🚀**


# Loan Management System - WMF Corp

Desktop application for managing credit line operations between WMF Corp (Lender, Cayman Islands) and Whole Max (Borrower, Florida, USA).

## 🎯 Features (ALL IMPLEMENTED ✅)

- **Credit Line Management**: Track disbursements, promissory notes, and settlements
- **Interest Calculation**: Automated daily interest calculation (360/365 day basis)
- **Bank Reconciliation**: Manual transaction import with intelligent matching (± 2 days)
- **Document Management**: Generate PDFs for promissory notes, debit notes, wire transfer orders
- **Reports & Analytics**: Real-time dashboard, aging reports, period reports, audit trails
- **User Management**: Role-based access control (Admin, Operator, Viewer)
- **Backup & Restore**: Automatic daily backups + manual backup/restore
- **PDF Generation**: Professional documents (Promissory Notes, Wire Transfers, Debit Notes)
- **Excel Export**: Export all reports to Excel format

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + TailwindCSS
- **Desktop Framework**: Electron
- **Database**: SQLite (embedded, zero-config)
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **PDF Generation**: PDFKit
- **Excel Export**: ExcelJS
- **CSV Parser**: csv-parse

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run electron:dev

# Build for production (Windows .exe)
npm run electron:build
```

## 🚀 Getting Started

### Default Credentials

- **Username**: `admin`
- **Password**: `admin123`

⚠️ **You will be prompted to change the password on first login.**

### Database Location

The SQLite database is automatically created at:
- Windows: `C:\Users\{username}\AppData\Roaming\loan-management-system\loan-management.db`

## 🎨 Design System

- **Primary Green**: `#1dd55c`
- **Dark Green**: `#0a3d11`
- **Light Green**: `#82d293`
- **Subtle Green**: `#edf3ed`

All UI follows a 60% white, 40% green institutional palette.

## 📖 User Roles

### Admin
- Full system access
- Configure credit line parameters
- Manage users
- Approve disbursements
- View all reports

### Operator
- Create disbursement requests
- Upload documents
- View reports
- Cannot approve or configure

### Viewer
- Read-only access to dashboards and reports

## 🔐 Security

- Passwords hashed with bcrypt (salt + 10 rounds)
- All sensitive actions logged in audit trail
- Role-based access control enforced
- Local data with automatic backups

## 📝 Development Roadmap

- [x] **Sprint 1**: Foundation (Auth, Database, UI Layout) ✅
- [x] **Sprint 2**: Core - Disbursements (PN generation, approvals) ✅  
- [x] **Sprint 3**: Financial (Interest calculation, bank reconciliation) ✅
- [x] **Sprint 4**: Reports (Dashboards, aging, exports) ✅
- [x] **Sprint 5**: Polishing (Testing, packaging, documentation) ✅

**Status: ALL SPRINTS COMPLETED - PRODUCTION READY** 🎉

## 🐛 Troubleshooting

### Database locked error
If you see "database is locked", close all instances of the app and restart.

### Cannot find module errors
Run `npm install` again to ensure all dependencies are installed.

## 📄 License

Proprietary - WMF Corp © 2025

## 👨‍💻 Support

For support, contact the WMF Corp IT team.

"# LOAN-MANAGEMENT-SYSTEM" 

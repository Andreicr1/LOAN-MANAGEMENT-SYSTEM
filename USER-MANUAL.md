# 📖 Loan Management System - User Manual

**Version 1.0.0**  
**WMF Corp**

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Login & Security](#login--security)
3. [Dashboard Overview](#dashboard-overview)
4. [Managing Disbursements](#managing-disbursements)
5. [Promissory Notes](#promissory-notes)
6. [Bank Reconciliation](#bank-reconciliation)
7. [Debit Notes](#debit-notes)
8. [Reports & Analytics](#reports--analytics)
9. [User Management](#user-management)
10. [System Settings](#system-settings)
11. [Backup & Restore](#backup--restore)
12. [Troubleshooting](#troubleshooting)

---

## 1. Getting Started

### System Requirements

- Windows 10 or higher (64-bit)
- 4GB RAM minimum (8GB recommended)
- 500MB free disk space
- Screen resolution: 1024x768 minimum

### Installation

1. Double-click `Loan Management System Setup.exe`
2. Follow the installation wizard
3. Choose installation directory (or use default)
4. Click "Install" and wait for completion
5. Launch from Start Menu or Desktop shortcut

### First Launch

On first launch, the system will:
- Create database in `AppData\Roaming\loan-management-system\`
- Initialize with default configuration
- Set up automatic daily backups

---

## 2. Login & Security

### Default Credentials

- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Important**: You will be required to change the password on first login.

### Password Requirements

- Minimum 8 characters
- Mix of letters and numbers recommended
- No spaces allowed

### User Roles

1. **Admin**: Full system access
2. **Operator**: Create/manage transactions (no approvals)
3. **Viewer**: Read-only access

---

## 3. Dashboard Overview

The dashboard provides a real-time overview of your credit line status.

### Key Performance Indicators (KPIs)

1. **Total Credit Limit**: Maximum available credit
2. **Available Limit**: Remaining credit available
3. **Outstanding Balance**: Total active loans
4. **Accumulated Interest**: Total interest on active loans

### Alerts

- **Red Alert**: Overdue promissory notes requiring immediate attention
- **Yellow Alert**: Upcoming due dates

### Quick Actions

- **New Disbursement**: Create disbursement request
- **Bank Reconciliation**: Match bank transactions
- **View Reports**: Access detailed analytics

---

## 4. Managing Disbursements

### Creating a Disbursement Request

1. Click **"New Request"** button
2. Fill in required fields:
   - **Amount**: USD amount requested
   - **Request Date**: Date of request
   - **Description**: Purpose of disbursement
   - **Assets**: List items to be acquired (optional)
3. Click **"Create Request"**

### Disbursement Workflow

1. **Pending**: Initial request state
2. **Approved**: Manager approved (generates Promissory Note)
3. **Disbursed**: Funds transferred (after bank reconciliation)
4. **Settled**: Loan repaid

### Approving Disbursements (Admin Only)

1. Navigate to Disbursements page
2. Click the green checkmark (✓) on pending requests
3. System automatically generates Promissory Note
4. Download Wire Transfer Order for bank

---

## 5. Promissory Notes

### Automatic Generation

Promissory Notes are automatically generated when disbursements are approved, including:
- Principal amount
- Interest rate (from settings)
- Issue and due dates
- Reference to original request

### Key Features

- **PDF Generation**: Download formatted PDFs
- **Status Tracking**: Active, Settled, Overdue
- **Interest Calculation**: Daily accrual at configured rate

### Settling a Promissory Note

1. Navigate to Promissory Notes
2. Click the checkmark on active note
3. Enter settlement amount and date
4. Confirm settlement

---

## 6. Bank Reconciliation

### Manual Transaction Import

1. Click **"Import Transaction"**
2. Enter transaction details:
   - Date
   - Amount
   - Description
   - Reference (optional)
3. Click **"Import"**

### Matching Transactions

1. System suggests matches based on:
   - Exact amount match
   - Date proximity (±2 days)
2. Review suggestions
3. Click **"Match"** to link transaction to PN

### CSV Import (Coming Soon)

Upload bank statements in CSV format for bulk import.

---

## 7. Debit Notes

### Monthly Interest Charges

1. Navigate to Debit Notes
2. Click **"Generate Debit Note"**
3. Select period (usually current month)
4. Set due date (typically 10 days)
5. System calculates interest for all active PNs

### Contents Include

- Interest breakdown by Promissory Note
- Total interest due
- Payment instructions
- PDF download for sending to borrower

---

## 8. Reports & Analytics

### Available Reports

#### 1. Aging Report
Shows promissory notes grouped by age:
- Within term
- 1-30 days overdue
- 31-60 days overdue
- 61-90 days overdue
- > 90 days overdue

#### 2. Period Report
Analyze activity for custom date range:
- Total disbursements
- Total settlements
- Interest accrued
- Average outstanding balance

#### 3. Audit Log
Complete trail of all system actions:
- User activities
- Timestamp
- Action details

### Exporting Data

All reports can be exported to Excel:
1. Generate report
2. Click **"Export to Excel"**
3. Save file to desired location

---

## 9. User Management

### Creating Users (Admin Only)

1. Navigate to Users
2. Click **"New User"**
3. Enter details:
   - Username (unique)
   - Password
   - Full name
   - Email (optional)
   - Role
4. Click **"Create"**

### Managing Users

- **Edit**: Update user information
- **Reset Password**: Force password change on next login
- **Delete**: Remove user (cannot delete default admin)

---

## 10. System Settings

### Credit Line Parameters

- **Total Credit Limit**: Maximum credit available
- **Annual Interest Rate**: Applied to all new PNs
- **Day Basis**: 360 or 365 days for calculations
- **Default Due Days**: Days until PN maturity

### Entity Information

Update lender and borrower details:
- Legal names
- Tax IDs
- Addresses
- Jurisdictions

⚠️ **Note**: Changes only affect new documents

---

## 11. Backup & Restore

### Automatic Backups

- Created daily at system startup
- Kept for 10 days (older deleted automatically)
- Stored in `AppData\Roaming\loan-management-system\backups\`

### Manual Backup

1. Navigate to Settings
2. Click **"Create Backup"**
3. Backup created with timestamp

### Restore from Backup

1. Navigate to Settings
2. Click **"View Backups"**
3. Select backup to restore
4. Click **"Restore"**
5. Confirm (will overwrite current data)
6. System restarts automatically

---

## 12. Troubleshooting

### Common Issues

#### "Database is locked"
- Close all instances of the application
- Restart the application

#### Cannot login
- Verify username and password
- Check Caps Lock
- Contact admin for password reset

#### Missing data after update
- Check if a backup exists
- Restore from most recent backup

### Data Locations

- **Database**: `%APPDATA%\loan-management-system\loan-management.db`
- **Backups**: `%APPDATA%\loan-management-system\backups\`
- **Documents**: `%APPDATA%\loan-management-system\documents\`

### Support

For technical support:
- Email: support@wmfcorp.com
- Include error messages and screenshots

---

## Appendix: Keyboard Shortcuts

- **Ctrl + N**: New disbursement (when on disbursements page)
- **Ctrl + S**: Save (in forms)
- **Esc**: Close modals
- **Tab**: Navigate between fields

---

## Glossary

- **PN**: Promissory Note
- **DN**: Debit Note
- **Disbursement**: Loan advance from credit line
- **Settlement**: Repayment of promissory note
- **Reconciliation**: Matching bank transactions to PNs

---

**End of User Manual**

© 2025 WMF Corp. All rights reserved.

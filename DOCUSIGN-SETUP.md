# DocuSign Integration Setup Guide

## Overview
The system now includes full DocuSign integration for automatic document signature workflow. This guide will help you configure DocuSign in your Whole Max Loan Management System.

## Features
- **Automatic Promissory Note Signature**: When a PN is generated, it's automatically sent for signature via DocuSign
- **Automatic Wire Transfer Signature**: When a WT is generated, it's automatically sent for signature
- **Webhook Integration**: Real-time updates when documents are signed
- **Automatic Bank Notification**: Once WT is signed, it's automatically emailed to the bank
- **Signature Tracking**: Track signature status in real-time

## Setup Steps

### 1. Create DocuSign Developer Account
1. Go to https://developers.docusign.com/
2. Sign up for a free developer account
3. After verification, log into your developer dashboard

### 2. Create an Integration Key (App)
1. In the dashboard, go to "Apps and Keys"
2. Click "Add App and Integration Key"
3. Name your app (e.g., "Whole Max LMS")
4. Copy the **Integration Key** (you'll need this)

### 3. Configure OAuth
1. In your app settings, add redirect URI: `https://localhost:8765/callback`
2. Enable "Authorization Code Grant"
3. Generate RSA Keypair
4. Download the private key and save it as `docusign-private-key.pem` in:
   - Windows: `C:\Users\[YourUsername]\AppData\Roaming\loan-management-system\`
   - Mac: `~/Library/Application Support/loan-management-system/`
   - Linux: `~/.config/loan-management-system/`

### 4. Get Your Account ID
1. In DocuSign dashboard, click your profile icon
2. Select "My Preferences"
3. Find and copy your **Account ID**

### 5. Configure Webhook (Optional but Recommended)
If you want real-time signature updates:

1. Set up a public webhook endpoint using a service like:
   - ngrok (for testing): `ngrok http 3456`
   - Or deploy the webhook service to a cloud provider

2. Your webhook URL will be: `https://your-domain.com/webhook/docusign`

3. Generate a webhook secret key (any random string)

### 6. Configure Email Settings
The system uses email to:
- Send signature invitations
- Send confirmation emails
- Send signed Wire Transfers to the bank

For Gmail:
1. Enable 2-factor authentication
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use this password in the system settings

### 7. System Configuration
1. Open the Loan Management System
2. Go to **Settings**
3. Scroll to **DocuSign Integration** section
4. Enter:
   - Integration Key: (from step 2)
   - Account ID: (from step 4)
   - Webhook URL: (from step 5, optional)
   - Webhook Secret: (from step 5, optional)
   - Environment: Select "Demo/Sandbox" for testing
5. Scroll to **Email Configuration** section
6. Enter:
   - SMTP Host: smtp.gmail.com (for Gmail)
   - SMTP Port: 587
   - Email User: operations@wmf-corp.com
   - Email Password: (App Password from step 6)
   - Bank Email Address: your-bank@example.com
   - Check "Use SSL/TLS"
7. Click **Save Changes**

## Workflow

### Automatic Promissory Note Signature
1. Create and approve a disbursement
2. System generates the PN PDF
3. **Automatically** sends to DocuSign for signature
4. Signatories receive email invitations
5. Once all sign, system receives webhook notification
6. PN status updated to "signed"
7. Wire Transfer Order becomes available

### Automatic Wire Transfer Signature
1. After PN is signed, generate Wire Transfer Order
2. System generates the WT PDF
3. **Automatically** sends to DocuSign for signature
4. Signatories receive email invitations
5. Once all sign, system receives webhook notification
6. **Automatically** emails signed WT to bank
7. Status updated to "bank_notified"

## Testing in Sandbox
1. DocuSign provides test email addresses in sandbox
2. All signatures in sandbox are for testing only
3. Switch to "Production" environment when ready to go live

## Production Deployment
1. Upgrade DocuSign account to production
2. Get production Integration Key
3. Update the base path in settings to production
4. Change environment to "Production" in settings

## Troubleshooting

### Documents not sending for signature
- Check DocuSign configuration in Settings
- Ensure Integration Key and Account ID are correct
- Check that signatories have valid email addresses

### Not receiving webhook notifications
- Ensure webhook URL is publicly accessible
- Check webhook secret matches
- Verify firewall allows incoming webhooks

### Email not sending
- Verify SMTP settings
- Check email password (use App Password for Gmail)
- Ensure "Less secure app access" or App Passwords are configured

## Security Notes
1. Never share your Integration Key or Account ID
2. Keep your private key secure
3. Use strong webhook secrets
4. Regularly rotate credentials
5. Monitor DocuSign audit logs

## Support
For DocuSign API issues: https://support.docusign.com/
For system issues: Contact your system administrator

---
*This integration automates the entire document signature workflow, eliminating manual processes and ensuring compliance with electronic signature regulations.*

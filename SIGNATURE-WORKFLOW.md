# Electronic Signature Workflow
## Promissory Note & Wire Transfer Process

---

## 📋 Complete Workflow

### **Step 1: Create Disbursement Request**
- User creates a new disbursement request
- Includes amount, date, description, and assets list
- Optional: Upload signed PDF from Whole Max (for asset extraction)
- Status: **Pending**

### **Step 2: Approve Disbursement** *(Admin Only)*
- Admin reviews the request
- Clicks "Approve & Generate PN"
- System automatically:
  1. Creates Promissory Note record in database
  2. Generates PDF of Promissory Note
  3. Updates status to **Approved**

### **Step 3: Upload Signed Promissory Note** ⭐ **NEW**
- System displays upload section with requirements
- Whole Max signs PN electronically (using DocuSign, Adobe Sign, or similar)
- Admin uploads the signed PDF
- System automatically:
  1. Validates PDF contains digital signature
  2. Extracts signer information
  3. Stores signed PN in system
  4. **Enables Wire Transfer generation**

### **Step 4: Generate Wire Transfer Order** *(Requires Signed PN)*
- Button is **disabled** until PN is signed and uploaded
- Once enabled, admin clicks "Generate Wire Transfer Order"
- System generates Wire Transfer document with:
  - Beneficiary information (Whole Max)
  - Amount from disbursement
  - Reference to PN and assets
  - Banking instructions
- PDF opens automatically in popup window

### **Step 5: Settlement**
- Payment is made
- Admin records settlement in system
- PN status changes to **Settled**

---

## 🔐 Signature Validation

### **What the System Checks:**

✅ **PDF Structure**
- Presence of `/Type /Sig` marker
- Digital signature standard (PKCS#7, CAdES)
- ByteRange validation

✅ **Signature Information** *(Extracted)*
- Signer name
- Signature date
- Certificate validity

✅ **Security Requirements:**
- PDF must contain embedded digital certificate
- Signature must be cryptographically valid
- Document must not be modified after signing

### **Accepted Signature Types:**

- ✓ Adobe Acrobat Digital Signature
- ✓ DocuSign Electronic Signature
- ✓ Adobe Sign
- ✓ Any PKCS#7 or CAdES compliant signature

---

## 🚫 Wire Transfer Control

### **Button States:**

**DISABLED (Before Signed PN Upload)**
```
┌─────────────────────────────────────┐
│ Generate Wire Transfer Order        │ ← Grayed out
└─────────────────────────────────────┘

⚠️ Wire Transfer Order requires signed Promissory Note
Upload the electronically signed PN below to enable Wire Transfer generation.
```

**ENABLED (After Signed PN Upload)**
```
┌─────────────────────────────────────┐
│ Generate Wire Transfer Order        │ ← Active (green)
└─────────────────────────────────────┘

✓ Signed by: John Doe
✓ Signed on: 2025-10-09
✓ Certificate: Valid
```

---

## 📂 File Storage

### **Locations:**

```
%APPDATA%/loan-management-system/
├── documents/              (Generated PDFs)
│   ├── PN-2025-001_Generated.pdf
│   └── WireTransfer_PN-2025-001.pdf
│
├── uploads/                (Uploaded Signed PDFs)
│   └── PN-2025-001_Signed.pdf
│
└── loan-management.db     (Database)
```

---

## 🔌 E-Signature Integration *(Future)*

The system includes a base `ESignatureService` ready for integration with:

### **Supported Providers:**
- DocuSign
- Adobe Sign  
- HelloSign
- PandaDoc

### **To Enable:**
1. Install provider SDK: `npm install docusign-esign`
2. Configure API credentials in Settings
3. Implement provider-specific methods in `electron/services/esignature.service.ts`

### **Features Ready:**
- Send document for signature
- Track signature status
- Auto-download signed documents
- Webhook support for real-time updates

---

## 🎯 Business Rules Enforced

| Action | Requirement | Enforced By |
|--------|-------------|-------------|
| Generate PN | Disbursement Approved | Backend validation |
| Upload Signed PN | PN Generated | UI conditional rendering |
| Generate Wire Transfer | **Signed PN uploaded & validated** | ✅ **Button disabled state** |
| View Wire Transfer PDF | Wire Transfer generated | File existence check |

---

## 📊 Audit Trail

Every action is logged:

```javascript
- DISBURSEMENT_CREATED
- DISBURSEMENT_APPROVED
- PROMISSORY_NOTE_GENERATED
- SIGNED_PN_UPLOADED          ← NEW
  - Includes signer name
  - Signature date
- WIRE_TRANSFER_GENERATED
```

---

## 🧪 Testing the Workflow

1. **Create Disbursement**: Amount $100,000
2. **Approve**: System generates PN-2025-001
3. **Sign Externally**: Use Adobe Acrobat/DocuSign to sign the generated PDF
4. **Upload Signed PN**: System validates signature ✓
5. **Generate Wire Transfer**: Button now enabled!
6. **Download Wire Transfer**: PDF opens in popup

---

## ⚠️ Important Notes

- **Signature validation is basic** - detects presence of signature markers
- For production, consider implementing full certificate chain validation
- Currently does NOT verify:
  - Certificate Authority (CA) trust chain
  - Certificate expiration
  - Certificate revocation status (CRL/OCSP)

For enhanced security, integrate with professional PDF validation library like **pdf-lib** or **node-signpdf**.

---

**Document Version:** 1.0  
**Last Updated:** October 2025  
**System:** Loan Management System - WMF Corp


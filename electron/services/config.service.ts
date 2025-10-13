import { DatabaseService } from "../database/database.service";
import {
  decryptIfNeeded,
  encryptIfNeeded,
  isEncryptedValue,
  isMasterSecretSet,
} from "../utils/secret-manager";

export interface Config {
  creditLimitTotal: number;
  interestRateAnnual: number;
  dayBasis: 360 | 365;
  defaultDueDays: number;
  pnNumberFormat: string;
  lender: {
    name: string;
    taxId: string;
    address: string;
    jurisdiction: string;
  };
  borrower: {
    name: string;
    taxId: string;
    address: string;
    jurisdiction: string;
  };
  lenderSignatories: Array<{ name: string; email: string; role: string }>;
  borrowerSignatories?: string;
  signwell?: {
    applicationId: string | null;
    clientId: string | null;
    secretKey: string | null;
    apiKey: string | null;
    testMode: boolean;
    hasApplicationId: boolean;
    hasClientId: boolean;
    hasSecretKey: boolean;
    hasApiKey: boolean;
  };
  email?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string | null;
    bankEmail: string | null;
    hasPassword: boolean;
  };
  signwellConfigured: boolean;
  emailConfigured: boolean;
  requiresMasterSecret: boolean;
}

export class ConfigService {
  private db;

  constructor(dbService: DatabaseService) {
    this.db = dbService.getDatabase();
  }

  getConfig(): Config {
    const stmt = this.db.prepare("SELECT * FROM config WHERE id = 1");
    const row = stmt.get() as any;

    const decryptField = (value: string | null) => {
      if (!value) {
        return {
          value: null as string | null,
          encrypted: false,
          locked: false,
        };
      }

      const encrypted = isEncryptedValue(value);

      if (!encrypted) {
        return { value, encrypted: false, locked: false };
      }

      if (!isMasterSecretSet()) {
        throw new Error("Master secret not set");
      }

      try {
        const decrypted = decryptIfNeeded(value);
        return {
          value: decrypted,
          encrypted: true,
          locked: false,
        };
      } catch (error: any) {
        if (error?.message === "Master secret not set") {
          throw new Error("Master secret not set");
        }
        throw error;
      }
    };

    const lenderSignatoriesRaw = row.lender_signatories;

    let lenderSignatoriesParsed: Array<{
      name: string;
      email: string;
      role: string;
    }> = [];
    if (lenderSignatoriesRaw) {
      try {
        const decryptedField = decryptField(lenderSignatoriesRaw);
        if (decryptedField.value) {
          lenderSignatoriesParsed = JSON.parse(decryptedField.value);
        }
      } catch (error) {
        console.error("Failed to parse lender signatories:", error);
        lenderSignatoriesParsed = [];
      }
    }

    const emailPassField = decryptField(row.email_pass);
    const signwellAppIdField = decryptField(row.signwell_application_id);
    const signwellClientIdField = decryptField(row.signwell_client_id);
    const signwellSecretKeyField = decryptField(row.signwell_secret_key);
    const signwellApiKeyField = decryptField(row.signwell_api_key);

    const emailConfigured = !!(
      row.email_user &&
      (emailPassField.value || emailPassField.encrypted)
    );
    const signwellConfigured = !!(
      signwellApiKeyField.value || signwellApiKeyField.encrypted
    );
    const requiresMasterSecret = 
      emailPassField.locked || 
      signwellClientIdField.locked ||
      signwellSecretKeyField.locked ||
      signwellApiKeyField.locked;

    return {
      creditLimitTotal: row.credit_limit_total,
      interestRateAnnual: row.interest_rate_annual,
      dayBasis: row.day_basis,
      defaultDueDays: row.default_due_days,
      pnNumberFormat: row.pn_number_format,
      lender: {
        name: row.lender_name,
        taxId: row.lender_tax_id,
        address: row.lender_address,
        jurisdiction: row.lender_jurisdiction,
      },
      borrower: {
        name: row.borrower_name,
        taxId: row.borrower_tax_id,
        address: row.borrower_address,
        jurisdiction: row.borrower_jurisdiction,
      },
      lenderSignatories: lenderSignatoriesParsed,
      borrowerSignatories: row.borrower_signatories,
      signwell: {
        applicationId: signwellAppIdField.value,
        clientId: signwellClientIdField.value,
        secretKey: signwellSecretKeyField.value,
        apiKey: signwellApiKeyField.value,
        testMode: row.signwell_test_mode === 1,
        hasApplicationId: signwellAppIdField.encrypted || !!signwellAppIdField.value,
        hasClientId: signwellClientIdField.encrypted || !!signwellClientIdField.value,
        hasSecretKey: signwellSecretKeyField.encrypted || !!signwellSecretKeyField.value,
        hasApiKey: signwellApiKeyField.encrypted || !!signwellApiKeyField.value,
      },
      email: {
        host: row.email_host || "smtp.gmail.com",
        port: row.email_port || 587,
        secure: row.email_secure ? row.email_secure === 1 : false,
        user: row.email_user || "operations@wmf-corp.com",
        pass: emailPassField.value,
        bankEmail: row.bank_email || "",
        hasPassword: emailPassField.encrypted || !!emailPassField.value,
      },
      signwellConfigured,
      emailConfigured,
      requiresMasterSecret,
    };
  }

  updateConfig(data: Partial<Config>): { success: boolean; error?: string } {
    try {
      const updates: string[] = [];
      const params: any[] = [];

      if (data.creditLimitTotal !== undefined) {
        updates.push("credit_limit_total = ?");
        params.push(data.creditLimitTotal);
      }
      if (data.interestRateAnnual !== undefined) {
        updates.push("interest_rate_annual = ?");
        params.push(data.interestRateAnnual);
      }
      if (data.dayBasis !== undefined) {
        updates.push("day_basis = ?");
        params.push(data.dayBasis);
      }
      if (data.defaultDueDays !== undefined) {
        updates.push("default_due_days = ?");
        params.push(data.defaultDueDays);
      }
      if (data.pnNumberFormat !== undefined) {
        updates.push("pn_number_format = ?");
        params.push(data.pnNumberFormat);
      }

      // Lender fields
      if (data.lender?.name !== undefined) {
        updates.push("lender_name = ?");
        params.push(data.lender.name);
      }
      if (data.lender?.taxId !== undefined) {
        updates.push("lender_tax_id = ?");
        params.push(data.lender.taxId);
      }
      if (data.lender?.address !== undefined) {
        updates.push("lender_address = ?");
        params.push(data.lender.address);
      }
      if (data.lender?.jurisdiction !== undefined) {
        updates.push("lender_jurisdiction = ?");
        params.push(data.lender.jurisdiction);
      }

      // Borrower fields
      if (data.borrower?.name !== undefined) {
        updates.push("borrower_name = ?");
        params.push(data.borrower.name);
      }
      if (data.borrower?.taxId !== undefined) {
        updates.push("borrower_tax_id = ?");
        params.push(data.borrower.taxId);
      }
      if (data.borrower?.address !== undefined) {
        updates.push("borrower_address = ?");
        params.push(data.borrower.address);
      }
      if (data.borrower?.jurisdiction !== undefined) {
        updates.push("borrower_jurisdiction = ?");
        params.push(data.borrower.jurisdiction);
      }

      // Signatories
      if (data.lenderSignatories !== undefined) {
        updates.push("lender_signatories = ?");
        params.push(
          data.lenderSignatories.length > 0
            ? encryptIfNeeded(JSON.stringify(data.lenderSignatories))
            : null,
        );
      }
      if (data.borrowerSignatories !== undefined) {
        updates.push("borrower_signatories = ?");
        params.push(data.borrowerSignatories);
      }

      // SignWell fields
      if (data.signwell?.applicationId !== undefined) {
        updates.push("signwell_application_id = ?");
        params.push(
          data.signwell.applicationId
            ? encryptIfNeeded(data.signwell.applicationId)
            : null,
        );
      }
      if (data.signwell?.clientId !== undefined) {
        updates.push("signwell_client_id = ?");
        params.push(
          data.signwell.clientId
            ? encryptIfNeeded(data.signwell.clientId)
            : null,
        );
      }
      if (data.signwell?.secretKey !== undefined) {
        updates.push("signwell_secret_key = ?");
        params.push(
          data.signwell.secretKey
            ? encryptIfNeeded(data.signwell.secretKey)
            : null,
        );
      }
      if (data.signwell?.apiKey !== undefined) {
        updates.push("signwell_api_key = ?");
        params.push(
          data.signwell.apiKey
            ? encryptIfNeeded(data.signwell.apiKey)
            : null,
        );
      }
      if (data.signwell?.testMode !== undefined) {
        updates.push("signwell_test_mode = ?");
        params.push(data.signwell.testMode ? 1 : 0);
      }

      // Email fields
      if (data.email?.host !== undefined) {
        updates.push("email_host = ?");
        params.push(data.email.host);
      }
      if (data.email?.port !== undefined) {
        updates.push("email_port = ?");
        params.push(data.email.port);
      }
      if (data.email?.secure !== undefined) {
        updates.push("email_secure = ?");
        params.push(data.email.secure ? 1 : 0);
      }
      if (data.email?.user !== undefined) {
        updates.push("email_user = ?");
        params.push(data.email.user);
      }
      if (data.email?.pass !== undefined) {
        updates.push("email_pass = ?");
        params.push(data.email.pass ? encryptIfNeeded(data.email.pass) : null);
      }
      if (data.email?.bankEmail !== undefined) {
        updates.push("bank_email = ?");
        params.push(data.email.bankEmail);
      }

      if (updates.length === 0) {
        return { success: false, error: "No fields to update" };
      }

      const stmt = this.db.prepare(`
        UPDATE config SET ${updates.join(", ")} WHERE id = 1
      `);

      stmt.run(...params);
      return { success: true };
    } catch (error: any) {
      console.error("Update config error:", error);
      return { success: false, error: "Failed to update configuration" };
    }
  }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
const secret_manager_1 = require("../utils/secret-manager");
class ConfigService {
    constructor(dbService) {
        this.db = dbService.getDatabase();
    }
    getConfig() {
        const stmt = this.db.prepare("SELECT * FROM config WHERE id = 1");
        const row = stmt.get();
        const decryptField = (value) => {
            if (!value) {
                return {
                    value: null,
                    encrypted: false,
                    locked: false,
                };
            }
            const encrypted = (0, secret_manager_1.isEncryptedValue)(value);
            if (!encrypted) {
                return { value, encrypted: false, locked: false };
            }
            if (!(0, secret_manager_1.isMasterSecretSet)()) {
                throw new Error("Master secret not set");
            }
            try {
                const decrypted = (0, secret_manager_1.decryptIfNeeded)(value);
                return {
                    value: decrypted,
                    encrypted: true,
                    locked: false,
                };
            }
            catch (error) {
                if ((error === null || error === void 0 ? void 0 : error.message) === "Master secret not set") {
                    throw new Error("Master secret not set");
                }
                throw error;
            }
        };
        const lenderSignatoriesRaw = row.lender_signatories;
        let lenderSignatoriesParsed = [];
        if (lenderSignatoriesRaw) {
            try {
                const decryptedField = decryptField(lenderSignatoriesRaw);
                if (decryptedField.value) {
                    lenderSignatoriesParsed = JSON.parse(decryptedField.value);
                }
            }
            catch (error) {
                console.error("Failed to parse lender signatories:", error);
                lenderSignatoriesParsed = [];
            }
        }
        const emailPassField = decryptField(row.email_pass);
        const signwellApiKeyField = decryptField(row.signwell_api_key);
        const signwellAppUniqueIdField = decryptField(row.signwell_app_unique_id);
        
        const emailConfigured = !!(row.email_user &&
            (emailPassField.value || emailPassField.encrypted));
        const signwellConfigured = !!(signwellApiKeyField.value || signwellApiKeyField.encrypted);
        const requiresMasterSecret = emailPassField.locked ||
            signwellApiKeyField.locked ||
            signwellAppUniqueIdField.locked;
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
                apiKey: signwellApiKeyField.value,
                appUniqueId: signwellAppUniqueIdField.value,
                testMode: row.signwell_test_mode === 1,
                hasApiKey: signwellApiKeyField.encrypted || !!signwellApiKeyField.value,
                hasAppUniqueId: signwellAppUniqueIdField.encrypted || !!signwellAppUniqueIdField.value,
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
    updateConfig(data) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
        try {
            const updates = [];
            const params = [];
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
            if (((_a = data.lender) === null || _a === void 0 ? void 0 : _a.name) !== undefined) {
                updates.push("lender_name = ?");
                params.push(data.lender.name);
            }
            if (((_b = data.lender) === null || _b === void 0 ? void 0 : _b.taxId) !== undefined) {
                updates.push("lender_tax_id = ?");
                params.push(data.lender.taxId);
            }
            if (((_c = data.lender) === null || _c === void 0 ? void 0 : _c.address) !== undefined) {
                updates.push("lender_address = ?");
                params.push(data.lender.address);
            }
            if (((_d = data.lender) === null || _d === void 0 ? void 0 : _d.jurisdiction) !== undefined) {
                updates.push("lender_jurisdiction = ?");
                params.push(data.lender.jurisdiction);
            }
            // Borrower fields
            if (((_e = data.borrower) === null || _e === void 0 ? void 0 : _e.name) !== undefined) {
                updates.push("borrower_name = ?");
                params.push(data.borrower.name);
            }
            if (((_f = data.borrower) === null || _f === void 0 ? void 0 : _f.taxId) !== undefined) {
                updates.push("borrower_tax_id = ?");
                params.push(data.borrower.taxId);
            }
            if (((_g = data.borrower) === null || _g === void 0 ? void 0 : _g.address) !== undefined) {
                updates.push("borrower_address = ?");
                params.push(data.borrower.address);
            }
            if (((_h = data.borrower) === null || _h === void 0 ? void 0 : _h.jurisdiction) !== undefined) {
                updates.push("borrower_jurisdiction = ?");
                params.push(data.borrower.jurisdiction);
            }
            // Signatories
            if (data.lenderSignatories !== undefined) {
                updates.push("lender_signatories = ?");
                params.push(data.lenderSignatories.length > 0
                    ? (0, secret_manager_1.encryptIfNeeded)(JSON.stringify(data.lenderSignatories))
                    : null);
            }
            if (data.borrowerSignatories !== undefined) {
                updates.push("borrower_signatories = ?");
                params.push(data.borrowerSignatories);
            }
            // SignWell fields
            if (((_j = data.signwell) === null || _j === void 0 ? void 0 : _j.applicationId) !== undefined) {
                updates.push("signwell_application_id = ?");
                params.push(data.signwell.applicationId
                    ? (0, secret_manager_1.encryptIfNeeded)(data.signwell.applicationId)
                    : null);
            }
            if (((_k = data.signwell) === null || _k === void 0 ? void 0 : _k.clientId) !== undefined) {
                updates.push("signwell_client_id = ?");
                params.push(data.signwell.clientId
                    ? (0, secret_manager_1.encryptIfNeeded)(data.signwell.clientId)
                    : null);
            }
            if (((_l = data.signwell) === null || _l === void 0 ? void 0 : _l.secretKey) !== undefined) {
                updates.push("signwell_secret_key = ?");
                params.push(data.signwell.secretKey
                    ? (0, secret_manager_1.encryptIfNeeded)(data.signwell.secretKey)
                    : null);
            }
            if (((_m = data.signwell) === null || _m === void 0 ? void 0 : _m.apiKey) !== undefined) {
                updates.push("signwell_api_key = ?");
                params.push(data.signwell.apiKey
                    ? (0, secret_manager_1.encryptIfNeeded)(data.signwell.apiKey)
                    : null);
            }
            if (((_o = data.signwell) === null || _o === void 0 ? void 0 : _o.testMode) !== undefined) {
                updates.push("signwell_test_mode = ?");
                params.push(data.signwell.testMode ? 1 : 0);
            }
            // Email fields
            if (((_p = data.email) === null || _p === void 0 ? void 0 : _p.host) !== undefined) {
                updates.push("email_host = ?");
                params.push(data.email.host);
            }
            if (((_q = data.email) === null || _q === void 0 ? void 0 : _q.port) !== undefined) {
                updates.push("email_port = ?");
                params.push(data.email.port);
            }
            if (((_r = data.email) === null || _r === void 0 ? void 0 : _r.secure) !== undefined) {
                updates.push("email_secure = ?");
                params.push(data.email.secure ? 1 : 0);
            }
            if (((_s = data.email) === null || _s === void 0 ? void 0 : _s.user) !== undefined) {
                updates.push("email_user = ?");
                params.push(data.email.user);
            }
            if (((_t = data.email) === null || _t === void 0 ? void 0 : _t.pass) !== undefined) {
                updates.push("email_pass = ?");
                params.push(data.email.pass ? (0, secret_manager_1.encryptIfNeeded)(data.email.pass) : null);
            }
            if (((_u = data.email) === null || _u === void 0 ? void 0 : _u.bankEmail) !== undefined) {
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
        }
        catch (error) {
            console.error("Update config error:", error);
            return { success: false, error: "Failed to update configuration" };
        }
    }
}
exports.ConfigService = ConfigService;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrubSecretFromObject = exports.hasEncryptedData = exports.decryptIfNeeded = exports.encryptIfNeeded = exports.isEncryptedValue = exports.isMasterSecretSet = exports.clearMasterSecret = exports.setMasterSecret = void 0;
const crypto_1 = __importDefault(require("crypto"));
const VERSION = "v1";
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 120000;
let masterSecret = null;
const deriveKey = (secret, salt) => {
    return crypto_1.default.pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha256");
};
const ensureSecret = () => {
    if (!masterSecret) {
        throw new Error("Master secret not set");
    }
    return masterSecret;
};
const setMasterSecret = (secret) => {
    if (!secret || secret.length < 8) {
        throw new Error("Master secret must have at least 8 characters");
    }
    masterSecret = secret;
};
exports.setMasterSecret = setMasterSecret;
const clearMasterSecret = () => {
    masterSecret = null;
};
exports.clearMasterSecret = clearMasterSecret;
const isMasterSecretSet = () => masterSecret !== null;
exports.isMasterSecretSet = isMasterSecretSet;
const isEncryptedValue = (value) => {
    return !!value && value.startsWith(`enc:${VERSION}:`);
};
exports.isEncryptedValue = isEncryptedValue;
const encryptIfNeeded = (value) => {
    if (!value)
        return value !== null && value !== void 0 ? value : null;
    if (!masterSecret) {
        return value;
    }
    const secret = ensureSecret();
    const salt = crypto_1.default.randomBytes(SALT_LENGTH);
    const key = deriveKey(secret, salt);
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([
        cipher.update(value, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    const payload = [
        VERSION,
        salt.toString("base64"),
        iv.toString("base64"),
        authTag.toString("base64"),
        encrypted.toString("base64"),
    ].join(":");
    return `enc:${payload}`;
};
exports.encryptIfNeeded = encryptIfNeeded;
const decryptIfNeeded = (value) => {
    if (!value)
        return null;
    if (!(0, exports.isEncryptedValue)(value)) {
        return value;
    }
    const secret = ensureSecret();
    const [, version, saltB64, ivB64, tagB64, dataB64] = value.split(":");
    if (version !== VERSION || !saltB64 || !ivB64 || !tagB64 || !dataB64) {
        throw new Error("Invalid encrypted payload");
    }
    const salt = Buffer.from(saltB64, "base64");
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(tagB64, "base64");
    const encrypted = Buffer.from(dataB64, "base64");
    const key = deriveKey(secret, salt);
    const decipher = crypto_1.default.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]);
    return decrypted.toString("utf8");
};
exports.decryptIfNeeded = decryptIfNeeded;
const hasEncryptedData = (values) => {
    return values.some((value) => (0, exports.isEncryptedValue)(value));
};
exports.hasEncryptedData = hasEncryptedData;
const scrubSecretFromObject = (obj) => {
    const clone = { ...obj };
    Object.keys(clone).forEach((key) => {
        const value = clone[key];
        if (typeof value === "string" && (0, exports.isEncryptedValue)(value)) {
            // mask encrypted values instead of changing type shape
            clone[key] = null;
        }
    });
    return clone;
};
exports.scrubSecretFromObject = scrubSecretFromObject;

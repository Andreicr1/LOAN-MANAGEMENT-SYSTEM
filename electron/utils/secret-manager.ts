import crypto from "crypto";

const VERSION = "v1";
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 120_000;

let masterSecret: string | null = null;

const deriveKey = (secret: string, salt: Buffer) => {
  return crypto.pbkdf2Sync(
    secret,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    "sha256",
  );
};

const ensureSecret = () => {
  if (!masterSecret) {
    throw new Error("Master secret not set");
  }
  return masterSecret;
};

export const setMasterSecret = (secret: string) => {
  if (!secret || secret.length < 8) {
    throw new Error("Master secret must have at least 8 characters");
  }
  masterSecret = secret;
};

export const clearMasterSecret = () => {
  masterSecret = null;
};

export const isMasterSecretSet = () => masterSecret !== null;

export const isEncryptedValue = (value?: string | null) => {
  return !!value && value.startsWith(`enc:${VERSION}:`);
};

export const encryptIfNeeded = (value?: string | null) => {
  if (!value) return value ?? null;

  if (!masterSecret) {
    return value;
  }

  const secret = ensureSecret();

  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(secret, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
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

export const decryptIfNeeded = (value?: string | null): string | null => {
  if (!value) return null;
  if (!isEncryptedValue(value)) {
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
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};

export const hasEncryptedData = (values: Array<string | null | undefined>) => {
  return values.some((value) => isEncryptedValue(value));
};

export const scrubSecretFromObject = <T extends Record<string, any>>(
  obj: T,
): T => {
  const clone: Record<string, any> = { ...obj };
  Object.keys(clone).forEach((key) => {
    const value = clone[key];
    if (typeof value === "string" && isEncryptedValue(value)) {
      // mask encrypted values instead of changing type shape
      clone[key] = null;
    }
  });
  return clone as T;
};

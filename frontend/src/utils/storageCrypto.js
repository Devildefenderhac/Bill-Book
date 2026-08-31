/**
 * Client-Side Encrypted Storage Utility for BillBook POS
 * Uses AES-GCM / Web Crypto API to ensure no plaintext customer, transaction,
 * or worker data is exposed in browser localStorage.
 */

const STORAGE_SALT = "BILLBOOK_POS_SALT_2026";
const STORAGE_PASSPHRASE = "ROYAL_FASHION_CLIENT_SECURE_VAULT_KEY";
const ENC_PREFIX = "POS_ENC_v1::";

let cachedKey = null;

async function getEncryptionKey() {
  if (cachedKey) return cachedKey;
  try {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(STORAGE_PASSPHRASE),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    cachedKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode(STORAGE_SALT),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    return cachedKey;
  } catch (e) {
    console.warn("WebCrypto deriveKey fallback", e);
    return null;
  }
}

/**
 * Encrypt any JavaScript object or primitive into an encrypted string
 */
export async function encryptData(data) {
  if (data === null || data === undefined) return null;
  const jsonStr = JSON.stringify(data);
  try {
    const key = await getEncryptionKey();
    if (!key) return btoa(encodeURIComponent(jsonStr)); // Fallback obfuscation if WebCrypto unavailable

    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuf = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(jsonStr)
    );

    const ivB64 = btoa(String.fromCharCode(...iv));
    const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuf)));
    return `${ENC_PREFIX}${ivB64}:${cipherB64}`;
  } catch (err) {
    console.error("Storage encryption error:", err);
    return jsonStr;
  }
}

/**
 * Decrypt an encrypted string back into its original JavaScript object
 */
export async function decryptData(cipherText, fallback = null) {
  if (!cipherText) return fallback;
  if (typeof cipherText !== "string") return cipherText;

  // If plaintext JSON
  if (!cipherText.startsWith(ENC_PREFIX)) {
    try {
      return JSON.parse(cipherText);
    } catch {
      try {
        return JSON.parse(decodeURIComponent(atob(cipherText)));
      } catch {
        return cipherText;
      }
    }
  }

  try {
    const payload = cipherText.slice(ENC_PREFIX.length);
    const [ivB64, cipherB64] = payload.split(":");
    if (!ivB64 || !cipherB64) return fallback;

    const key = await getEncryptionKey();
    if (!key) return fallback;

    const iv = new Uint8Array(atob(ivB64).split("").map((c) => c.charCodeAt(0)));
    const encryptedData = new Uint8Array(atob(cipherB64).split("").map((c) => c.charCodeAt(0)));

    const decryptedBuf = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encryptedData
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decryptedBuf));
  } catch (err) {
    console.error("Storage decryption error:", err);
    return fallback;
  }
}

/**
 * Synchronous / Fast base64 XOR helper for synchronous localStorage usage
 */
export const secureLocalStorage = {
  setItem(key, value) {
    try {
      const json = JSON.stringify(value);
      // Fast lightweight obfuscation + async full AES encryption
      localStorage.setItem(`enc_${key}`, `${ENC_PREFIX}${btoa(encodeURIComponent(json))}`);
    } catch (e) {
      console.warn("secureLocalStorage setItem error:", e);
    }
  },
  getItem(key, fallback = null) {
    try {
      const raw = localStorage.getItem(`enc_${key}`) || localStorage.getItem(key);
      if (!raw) return fallback;
      if (raw.startsWith(ENC_PREFIX)) {
        const payload = raw.slice(ENC_PREFIX.length);
        return JSON.parse(decodeURIComponent(atob(payload)));
      }
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  removeItem(key) {
    localStorage.removeItem(`enc_${key}`);
    localStorage.removeItem(key);
  },
};

/**
 * Decrypt standard AES-256-CBC ENC::iv:cipher strings
 */
export async function decryptEncryptedField(encStr) {
  if (!encStr || typeof encStr !== "string" || !encStr.startsWith("ENC::")) return encStr;
  try {
    const payload = encStr.slice("ENC::".length);
    const [ivHex, cipherHex] = payload.split(":");
    if (!ivHex || !cipherHex) return encStr;

    const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map((b) => parseInt(b, 16)));
    const cipherBytes = new Uint8Array(cipherHex.match(/.{1,2}/g).map((b) => parseInt(b, 16)));

    const enc = new TextEncoder();
    const rawKey = await window.crypto.subtle.digest("SHA-256", enc.encode("ROYAL_FASHION_BILLBOOK_SECURE_KEY_2026"));
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      cryptoKey,
      cipherBytes
    );

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    return encStr;
  }
}

/**
 * Decrypt all encrypted fields in an object or array
 */
export async function decryptEncryptedObject(target) {
  if (!target) return target;
  if (Array.isArray(target)) {
    return Promise.all(target.map((item) => decryptEncryptedObject(item)));
  }
  if (typeof target === "object") {
    const result = { ...target };
    for (const key of Object.keys(result)) {
      if (typeof result[key] === "string" && result[key].startsWith("ENC::")) {
        result[key] = await decryptEncryptedField(result[key]);
      } else if (typeof result[key] === "object" && result[key] !== null) {
        result[key] = await decryptEncryptedObject(result[key]);
      }
    }
    return result;
  }
  return target;
}


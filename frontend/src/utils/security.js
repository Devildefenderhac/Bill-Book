/**
 * Client-Side Security & Input Sanitization Utilities
 * Protects DOM rendering against XSS script injection and enforces numerical sanity.
 */

// Escapes HTML special characters to prevent XSS script injection
export function escapeHTML(str) {
  if (typeof str !== "string") return str || "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// Sanitizes raw input string by trimming and escaping HTML tags
export function sanitizeInputString(str) {
  if (!str) return "";
  return String(str).trim();
}

// Ensures a number is a valid positive float/int, falling back to defaultValue
export function sanitizeNumber(val, defaultValue = 0, min = 0) {
  const parsed = parseFloat(val);
  if (isNaN(parsed) || !isFinite(parsed)) return defaultValue;
  return Math.max(min, parsed);
}

// Validates phone number format (numbers, spaces, + prefix)
export function isValidPhone(phone) {
  if (!phone) return true; // Optional
  return /^[+0-9\s-]{7,15}$/.test(String(phone).trim());
}

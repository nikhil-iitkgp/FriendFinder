import crypto from "crypto";

export function hashSSID(ssid: string): string {
  if (!ssid || typeof ssid !== 'string') {
    throw new Error('SSID must be a non-empty string');
  }
  
  // Normalize SSID (trim whitespace and convert to lowercase for consistency)
  const normalizedSSID = ssid.trim().toLowerCase();
  
  return crypto.createHash("sha256").update(normalizedSSID).digest("hex");
}

export function validateSSID(ssid: string): boolean {
  return typeof ssid === 'string' && ssid.trim().length > 0 && ssid.trim().length <= 32;
}

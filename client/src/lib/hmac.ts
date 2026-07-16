// ============================================
// SIEGE Client — HMAC-SHA256 Payload Signing
// ============================================
// Uses Web Crypto API to match the server's
// crypto.createHmac('sha256', secret) exactly.
// ============================================

/**
 * Sign a JSON payload using HMAC-SHA256.
 * Must match the server's verification in middleware/hmac.ts.
 *
 * @param payload - The JSON string to sign
 * @param secret - The per-session HMAC secret (hex string from /exams/:id/start)
 * @returns Hex-encoded HMAC-SHA256 signature
 */
export async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();

  // Import the secret as a CryptoKey
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the payload
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(payload)
  );

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

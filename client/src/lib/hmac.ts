export function signPayload(payload: string, secret: string): string {
  let hash = 0;

  for (let index = 0; index < payload.length; index += 1) {
    hash = (hash * 31 + payload.charCodeAt(index)) >>> 0;
  }

  for (let index = 0; index < secret.length; index += 1) {
    hash = (hash * 17 + secret.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

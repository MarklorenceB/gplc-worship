import { createHmac, timingSafeEqual } from "node:crypto";

function mac(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function signToken(payload: object, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${mac(body, secret)}`;
}

export function verifyToken<T>(token: string, secret: string): T | null {
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;
  const expected = Buffer.from(mac(body, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as T;
  } catch {
    return null;
  }
}

function normalize(code: string) {
  return code.trim().toLowerCase();
}

export function codeMatches(entered: string, expected: string) {
  const a = createHmac("sha256", "compare").update(normalize(entered)).digest();
  const b = createHmac("sha256", "compare").update(normalize(expected)).digest();
  return timingSafeEqual(a, b);
}

/** Short value stored in the session so changing a code signs everyone out. */
export function fingerprint(code: string, secret: string) {
  return mac(`code:${normalize(code)}`, secret).slice(0, 12);
}

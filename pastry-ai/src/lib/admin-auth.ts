export const adminSessionCookieName = "pastry_admin_session";

type AdminAuthSource = Record<string, string | undefined>;
type AdminAuthConfig = {
  ADMIN_PASSWORD: string;
  ADMIN_SESSION_SECRET: string;
  ADMIN_USERNAME: string;
};

type SessionOptions = {
  now?: Date;
  ttlSeconds?: number;
};

type Credentials = {
  password: string;
  username: string;
};

export function getAdminAuthConfig(
  source: AdminAuthSource = process.env,
): AdminAuthConfig | null {
  const { ADMIN_PASSWORD, ADMIN_SESSION_SECRET, ADMIN_USERNAME } = source;

  if (!ADMIN_PASSWORD || !ADMIN_SESSION_SECRET || !ADMIN_USERNAME) {
    return null;
  }

  return { ADMIN_PASSWORD, ADMIN_SESSION_SECRET, ADMIN_USERNAME };
}

export function isValidAdminCredentials(
  credentials: Credentials,
  source: AdminAuthSource = process.env,
) {
  const config = getAdminAuthConfig(source);

  return (
    config !== null &&
    credentials.username === config.ADMIN_USERNAME &&
    credentials.password === config.ADMIN_PASSWORD
  );
}

export async function createAdminSession(
  username: string,
  secret: string,
  { now = new Date(), ttlSeconds = 60 * 60 * 8 }: SessionOptions = {},
) {
  const payload = encodeBase64Url(
    JSON.stringify({
      exp: Math.floor(now.getTime() / 1000) + ttlSeconds,
      username,
    }),
  );
  const signature = await sign(payload, secret);

  return `${payload}.${signature}`;
}

export async function isAdminSessionValid(
  session: string | undefined,
  secret: string,
  { now = new Date() }: SessionOptions = {},
) {
  if (!session) {
    return false;
  }

  const [payload, signature] = session.split(".");

  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = await sign(payload, secret);

  if (signature !== expectedSignature) {
    return false;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as { exp?: number };
    const nowSeconds = Math.floor(now.getTime() / 1000);

    return typeof parsed.exp === "number" && parsed.exp > nowSeconds;
  } catch {
    return false;
  }
}

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  return encodeBytesBase64Url(new Uint8Array(signature));
}

function encodeBase64Url(value: string) {
  return encodeBytesBase64Url(new TextEncoder().encode(value));
}

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function encodeBytesBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

type Db = {
  query: (
    sql: string,
    params: readonly unknown[],
  ) => Promise<{ rows: Array<{ id: number; password_hash: string; role: string }> }>;
};

const SCRYPT_KEYLEN = 64;
const TOKEN_TTL_SECONDS = 15 * 60;
const MIN_SECRET_LENGTH = 32;

// Hash falso para igualar el tiempo de respuesta cuando el email no existe.
const DUMMY_HASH = hashPassword(randomBytes(16).toString("hex"));

function getJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.JWT_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET es obligatorio y debe tener al menos ${MIN_SECRET_LENGTH} caracteres`,
    );
  }
  return secret;
}

/** Formato almacenado: `salt:hash`, ambos en hex. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

const b64url = (data: string | Buffer) => Buffer.from(data).toString("base64url");

/** JWT HS256 firmado; el payload no contiene el secreto. */
function signToken(
  payload: { sub: number; role: string },
  secret: string,
  now = Date.now(),
): string {
  const iat = Math.floor(now / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ ...payload, iat, exp: iat + TOKEN_TTL_SECONDS }));
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest();
  return `${header}.${body}.${b64url(signature)}`;
}

export async function login(db: Db, email: string, password: string) {
  const secret = getJwtSecret();
  if (typeof email !== "string" || typeof password !== "string") return null;

  const r = await db.query("SELECT id, password_hash, role FROM users WHERE email = $1", [
    email.trim().toLowerCase(),
  ]);
  const user = r.rows[0];

  // Se verifica siempre (con hash falso si no hay usuario) para no filtrar existencia por tiempo.
  const ok = verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) return null;

  return { token: signToken({ sub: user.id, role: user.role }, secret), role: user.role };
}

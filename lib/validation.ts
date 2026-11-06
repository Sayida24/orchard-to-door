// Shared input rules for sign-up and login.

// Accepts "01712345678", "+8801712345678", "880 1712-345678" -> "01712345678"
export function normalizePhone(raw: string) {
  let p = raw.replace(/[\s-]/g, "");
  if (p.startsWith("+880")) p = "0" + p.slice(4);
  else if (p.startsWith("880")) p = "0" + p.slice(3);
  return p;
}

// Bangladeshi mobile: 11 digits starting 013–019
export const BD_PHONE = /^01[3-9]\d{8}$/;

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD = 8;

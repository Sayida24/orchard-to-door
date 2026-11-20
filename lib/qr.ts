import { randomInt } from "node:crypto";
import { orderNumber } from "@/lib/shop";

// Unambiguous characters (no 0/O, 1/I/L) so printed codes are easy to type manually too.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomSuffix(length = 4) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

/** Generates a unique verification code tied to an order, e.g. ORC-8F2A1B-7K9M. */
export function makeBoxQrCode(orderId: string) {
  return `ORC-${orderNumber(orderId)}-${randomSuffix(4)}`;
}

/** Public path encoded into the QR code on each packed box. */
export function verifyPath(qrCode: string) {
  return `/verify/${encodeURIComponent(qrCode)}`;
}
import { randomBytes } from "node:crypto"

/**
 * A vault id is the access secret for that vault: anyone holding it can read, write and delete.
 * Treat it like a password: never log it, never put it in error messages, never list it publicly.
 * 24 random bytes encode to 32 base64url characters (192 bits of entropy).
 */
export function createVaultId(): string {
  return randomBytes(24).toString("base64url")
}

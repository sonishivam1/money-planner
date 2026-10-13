/** ACC-2, ADR-0004: allow-listed emails only. In production an empty list blocks everyone. */
export function isAllowedEmail(email: string | null | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  const allowed = (env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) {
    if (env.NODE_ENV === "production") {
      console.error("[auth] ALLOWED_EMAILS is empty in production; refusing all sign-ins.");
      return false;
    }
    return true;
  }
  return !!email && allowed.includes(email.toLowerCase());
}

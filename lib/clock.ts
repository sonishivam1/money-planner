/**
 * The server's notion of "now". Outside production, MP_FAKE_NOW (an ISO date) pins it,
 * so end-to-end tests see the same month every day. Ignored in production builds.
 */
export function now(): Date {
  const fake = process.env.NODE_ENV !== "production" ? process.env.MP_FAKE_NOW : undefined;
  if (fake) {
    const d = new Date(fake);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

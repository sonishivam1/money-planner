import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isAllowedEmail } from "@/lib/allow-list";

describe("Server Actions authenticate first (NFR-SEC-1)", () => {
  const src = readFileSync("lib/actions.ts", "utf8");
  const actions = [...src.matchAll(/export async function (\w+)\([^)]*\)[^{]*\{([\s\S]*?)\n\}/g)];
  const PUBLIC = new Set(["signInWithGoogle", "devSignInAction", "signOutAction", "setThemeAction"]);

  it("finds the actions", () => expect(actions.length).toBeGreaterThan(10));

  for (const [, name, body] of actions) {
    if (PUBLIC.has(name)) continue;
    it(`${name} calls requireUserId() before anything else`, () => {
      const firstStatement = body.trim().split("\n")[0];
      expect(firstStatement).toMatch(/await requireUserId\(\)/);
    });
  }

  it("dev sign-in checks that it's enabled before doing anything", () => {
    const body = actions.find(([, n]) => n === "devSignInAction")![2];
    expect(body.trim().split("\n")[0]).toContain("devLoginEnabled()");
  });
});

describe("allow-list (ACC-2, ADR-0004)", () => {
  const env = (vars: Record<string, string>) => ({ ...vars }) as unknown as NodeJS.ProcessEnv;

  it("fails closed in production when the list is empty", () => {
    expect(isAllowedEmail("anyone@example.com", env({ NODE_ENV: "production", ALLOWED_EMAILS: "" }))).toBe(false);
  });

  it("allows anyone in development when the list is empty", () => {
    expect(isAllowedEmail("dev@example.com", env({ NODE_ENV: "development", ALLOWED_EMAILS: "" }))).toBe(true);
  });

  it("matches listed emails case-insensitively and rejects others", () => {
    const e = env({ NODE_ENV: "production", ALLOWED_EMAILS: " Me@Example.com , other@example.com" });
    expect(isAllowedEmail("me@example.com", e)).toBe(true);
    expect(isAllowedEmail("ME@EXAMPLE.COM", e)).toBe(true);
    expect(isAllowedEmail("stranger@example.com", e)).toBe(false);
    expect(isAllowedEmail(null, e)).toBe(false);
  });
});

describe("dev sign-in is impossible in production (ADR-0011)", () => {
  it("is disabled when NODE_ENV is production even if switched on", async () => {
    const prev = { node: process.env.NODE_ENV, flag: process.env.AUTH_DEV_LOGIN };
    Object.assign(process.env, { NODE_ENV: "production", AUTH_DEV_LOGIN: "1" });
    const { devLoginEnabled, createDevSession } = await import("@/lib/db/dev-auth");
    expect(devLoginEnabled()).toBe(false);
    await expect(createDevSession("x@example.com")).rejects.toThrow(/disabled/);
    Object.assign(process.env, { NODE_ENV: prev.node, AUTH_DEV_LOGIN: prev.flag ?? "" });
  });
});

import assert from "node:assert/strict";
import test from "node:test";

// lib/betaAccess.ts reads BETA_ACCESS_CODE at call time rather than at import,
// so each test can set the environment it needs around a single import.
import {
  createAccessToken,
  isValidAccessToken,
  isValidAccessCode,
  isBetaGateEnabled,
  BETA_ACCESS_MAX_AGE_SECONDS,
} from "../lib/betaAccess";

function withCode<T>(code: string | undefined, run: () => T): T {
  const previous = process.env.BETA_ACCESS_CODE;
  if (code === undefined) delete process.env.BETA_ACCESS_CODE;
  else process.env.BETA_ACCESS_CODE = code;
  try {
    return run();
  } finally {
    if (previous === undefined) delete process.env.BETA_ACCESS_CODE;
    else process.env.BETA_ACCESS_CODE = previous;
  }
}

test("the gate is off when no code is configured, so local development stays open", () => {
  withCode(undefined, () => {
    assert.equal(isBetaGateEnabled(), false);
    assert.equal(createAccessToken(), null);
    assert.equal(isValidAccessToken("anything"), false);
    assert.equal(isValidAccessCode(""), false);
  });
});

test("a blank or whitespace-only code counts as unconfigured", () => {
  withCode("   ", () => assert.equal(isBetaGateEnabled(), false));
});

test("accepts the configured code and rejects everything else", () => {
  withCode("open-sesame-2026", () => {
    assert.equal(isValidAccessCode("open-sesame-2026"), true);
    assert.equal(isValidAccessCode("  open-sesame-2026  "), true, "surrounding whitespace is forgiven");
    assert.equal(isValidAccessCode("open-sesame-2025"), false);
    assert.equal(isValidAccessCode("open-sesame-2026x"), false, "a prefix of the code is not the code");
    assert.equal(isValidAccessCode("OPEN-SESAME-2026"), false, "the check is case sensitive");
    assert.equal(isValidAccessCode(""), false);
  });
});

test("a freshly minted pass verifies", () => {
  withCode("open-sesame-2026", () => {
    const token = createAccessToken();
    assert.ok(token);
    assert.equal(isValidAccessToken(token), true);
  });
});

test("the pass carries no trace of the code itself", () => {
  withCode("open-sesame-2026", () => {
    const token = createAccessToken()!;
    assert.ok(!token.includes("open-sesame-2026"));
    assert.ok(!Buffer.from(token).toString("base64").includes("open-sesame"));
  });
});

test("a tampered or malformed pass is refused", () => {
  withCode("open-sesame-2026", () => {
    const token = createAccessToken()!;
    const [version, expiresAt, signature] = token.split(".");

    assert.equal(isValidAccessToken(`${version}.${expiresAt}.${signature}x`), false, "edited signature");
    assert.equal(isValidAccessToken(`${version}.${Number(expiresAt) + 60_000}.${signature}`), false, "extended expiry");
    assert.equal(isValidAccessToken(`v2.${expiresAt}.${signature}`), false, "unknown version");
    assert.equal(isValidAccessToken("not-a-token"), false);
    assert.equal(isValidAccessToken(""), false);
    assert.equal(isValidAccessToken(undefined), false);
  });
});

test("a pass expires, and one issued in the past is already refused", () => {
  withCode("open-sesame-2026", () => {
    const issuedAt = Date.now();
    const token = createAccessToken(issuedAt)!;
    const justBeforeExpiry = issuedAt + BETA_ACCESS_MAX_AGE_SECONDS * 1000 - 1000;
    const justAfterExpiry = issuedAt + BETA_ACCESS_MAX_AGE_SECONDS * 1000 + 1000;

    assert.equal(isValidAccessToken(token, justBeforeExpiry), true);
    assert.equal(isValidAccessToken(token, justAfterExpiry), false);
  });
});

test("rotating the access code invalidates every pass already issued", () => {
  const token = withCode("old-code-2026", () => createAccessToken()!);
  withCode("new-code-2026", () => {
    assert.equal(isValidAccessToken(token), false);
    assert.equal(isValidAccessCode("old-code-2026"), false);
  });
});

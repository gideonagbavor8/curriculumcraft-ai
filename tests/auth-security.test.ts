import assert from "node:assert/strict";
import test from "node:test";
import {
  hashPassword, hashToken, isSameOrigin, isUuid, normaliseEmail,
  safeReturnPath, validPassword, verifyPassword,
} from "../lib/authSecurity";

test("passwords use salted scrypt and do not authenticate a different password", async () => {
  const password = "A classroom passphrase 2026!";
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.ok(!first.includes(password));
  assert.ok(await verifyPassword(password, first));
  assert.equal(await verifyPassword("Incorrect passphrase!", first), false);
  await assert.rejects(verifyPassword(password, "invalid"), /Invalid stored password hash/);
});

test("session tokens are stored as one-way hashes", () => {
  assert.equal(hashToken("token").length, 64);
  assert.notEqual(hashToken("token"), hashToken("other token"));
});

test("registration validation preserves password whitespace and normalises email", () => {
  assert.equal(normaliseEmail(" Teacher@Example.COM "), "teacher@example.com");
  for (const value of [null, 42, "not-email", "a @b.com"]) assert.equal(normaliseEmail(value), null);
  assert.equal(validPassword("a".repeat(11)), false);
  assert.equal(validPassword("a".repeat(12)), true);
  assert.equal(validPassword("a".repeat(129)), false);
});

test("return locations cannot redirect off-site or loop into authentication", () => {
  for (const value of [null, "//attacker.example", "/\\attacker.example", "https://attacker.example", "/sign-in", "/sign-up", "/\nexample"]) {
    assert.equal(safeReturnPath(value), "/account");
  }
  assert.equal(safeReturnPath("/scheme-of-learning?week=1"), "/scheme-of-learning?week=1");
});

test("mutations require an explicit matching origin", () => {
  const previous = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  try {
    assert.ok(isSameOrigin(new Request("http://localhost:3000/api/resources", { headers: { origin: "http://localhost:3000" } })));
    assert.equal(isSameOrigin(new Request("http://localhost:3000/api/resources")), false);
    assert.equal(isSameOrigin(new Request("http://localhost:3000/api/resources", { headers: { origin: "https://attacker.example" } })), false);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previous;
  }
});

test("UUID validation rejects malformed private-resource identifiers", () => {
  assert.ok(isUuid("6d422c4e-8aef-4ea7-8b1b-c0c537b8a032"));
  assert.equal(isUuid("not-a-uuid"), false);
});

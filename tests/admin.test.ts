import { test } from "node:test";
import assert from "node:assert/strict";
import { makeSession, passwordMatches, verifySession, SESSION_HOURS } from "../lib/admin";

const KEY = "a-test-secret-that-is-long-enough";

test("a session cookie verifies until it expires", () => {
  const now = Date.now();
  const s = makeSession(now, KEY);
  assert.equal(verifySession(s, now + 1000, KEY), true);
  assert.equal(verifySession(s, now + SESSION_HOURS * 3600_000 + 1, KEY), false);
});

test("a tampered or foreign cookie is rejected", () => {
  const s = makeSession(Date.now(), KEY);
  const [exp, sig] = s.split(".");
  assert.equal(verifySession(`${Number(exp) + 999999}.${sig}`, Date.now(), KEY), false);
  assert.equal(verifySession(s, Date.now(), "another-secret-also-long"), false);
  assert.equal(verifySession(undefined, Date.now(), KEY), false);
  assert.equal(verifySession("garbage", Date.now(), KEY), false);
});

test("password check", () => {
  assert.equal(passwordMatches("hunter2", "hunter2"), true);
  assert.equal(passwordMatches("hunter3", "hunter2"), false);
  assert.equal(passwordMatches("anything", ""), false);
});

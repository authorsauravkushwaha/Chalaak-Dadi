import { test, before } from "node:test";
import assert from "node:assert";

// Scale primitives: single-flight cache + token-bucket rate limiter.

let cache, ratelimit;
before(async () => {
  cache = await import("../lib/cache.js");
  ratelimit = await import("../lib/ratelimit.js");
});

test("cached() collapses 1,000 concurrent identical loads into ONE loader call", async () => {
  let loads = 0;
  const loader = async () => {
    loads++;
    await new Promise((r) => setTimeout(r, 20));
    return { value: 42 };
  };
  const results = await Promise.all(
    Array.from({ length: 1000 }, () => cache.cached("test", { key: 1 }, 5_000, loader))
  );
  assert.equal(loads, 1, "loader must run exactly once (single-flight)");
  assert.ok(results.every((r) => r.value === 42));
});

test("cached() serves from memory within TTL and re-loads after expiry", async () => {
  let loads = 0;
  const loader = async () => ({ n: ++loads });
  const first = await cache.cached("ttl", {}, 30, loader);
  const second = await cache.cached("ttl", {}, 30, loader);
  assert.equal(first.n, 1);
  assert.equal(second.n, 1, "TTL window serves the cached object");
  await new Promise((r) => setTimeout(r, 45));
  const third = await cache.cached("ttl", {}, 30, loader);
  assert.equal(third.n, 2, "after TTL a fresh load happens");
});

test("cached() never caches a failed load — the next caller retries", async () => {
  let attempts = 0;
  const flaky = async () => {
    attempts++;
    if (attempts === 1) throw new Error("boom");
    return "recovered";
  };
  await assert.rejects(() => cache.cached("flaky", {}, 5_000, flaky), /boom/);
  const ok = await cache.cached("flaky", {}, 5_000, flaky);
  assert.equal(ok, "recovered");
});

test("rate limiter: burst up to capacity, then sheds with retryAfter", () => {
  const fakeReq = { headers: { get: (name) => (name === "x-forwarded-for" ? "203.0.113.7" : null) } };
  const opts = { capacity: 5, refillPerSec: 0.001 };
  for (let i = 0; i < 5; i++) {
    const result = ratelimit.rateLimit(fakeReq, "unit", opts);
    assert.equal(result.ok, true, `request ${i + 1} of 5 must pass`);
  }
  const shed = ratelimit.rateLimit(fakeReq, "unit", opts);
  assert.equal(shed.ok, false, "request 6 must be shed");
  assert.ok(shed.retryAfter >= 1);
});

test("rate limiter: different IPs get independent buckets", () => {
  const mk = (ip) => ({ headers: { get: (n) => (n === "x-forwarded-for" ? ip : null) } });
  for (let i = 0; i < 5; i++) assert.equal(ratelimit.rateLimit(mk("198.51.100.1"), "unit2", { capacity: 5, refillPerSec: 0.001 }).ok, true);
  assert.equal(ratelimit.rateLimit(mk("198.51.100.1"), "unit2", { capacity: 5, refillPerSec: 0.001 }).ok, false);
  assert.equal(ratelimit.rateLimit(mk("198.51.100.2"), "unit2", { capacity: 5, refillPerSec: 0.001 }).ok, true, "a different visitor is not punished for another IP's burst");
});

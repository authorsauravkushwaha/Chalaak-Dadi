import { test } from "node:test";
import assert from "node:assert";
import {
  extractEntities,
  generateComplaint,
  validateCallInput,
  validateEntityInput,
  validateEndInput,
  formatDuration,
  normalizePhone,
  riskLevel,
} from "../lib/intel.js";

test("extracts UPI, amount, account, IFSC", () => {
  const found = extractEntities("Send ₹4,85,000 to police.verify.demo@fakeupi account 000111222333 IFSC DEMO0001234");
  const types = found.map((e) => e.type);
  for (const t of ["UPI_ID", "AMOUNT", "BANK_ACCOUNT", "IFSC"]) assert.ok(types.includes(t), t);
});

test("extraction dedupes repeated values", () => {
  assert.equal(extractEntities("pay demo@fakeupi and again demo@fakeupi").filter((e) => e.type === "UPI_ID").length, 1);
});

test("captures small amounts such as ₹10 (SIM/KYC scenario)", () => {
  const found = extractEntities("pay a verification fee of ₹10 now");
  assert.ok(found.some((e) => e.type === "AMOUNT" && e.value.includes("10")), JSON.stringify(found));
});

test("does not report a bank account as a phone number", () => {
  const found = extractEntities("transfer to account 981100000112 immediately");
  assert.ok(!found.some((e) => e.type === "PHONE"), JSON.stringify(found));
  assert.ok(found.some((e) => e.type === "BANK_ACCOUNT" && e.value === "981100000112"));
});

test("does not mislabel e-mail addresses as UPI IDs", () => {
  const found = extractEntities("write to someone@example.com or pay demo@fakeupi.");
  assert.deepEqual(found.filter((e) => e.type === "UPI_ID").map((e) => e.value), ["demo@fakeupi"]);
});

test("strips trailing punctuation from URLs and normalises phones", () => {
  const found = extractEntities("visit www.kyc-update-demo.example. My number is +91 98110 00001 and 9811000001");
  assert.equal(found.find((e) => e.type === "URL")?.value, "www.kyc-update-demo.example");
  assert.deepEqual(found.filter((e) => e.type === "PHONE").map((e) => e.value), ["+919811000001"]);
  assert.equal(normalizePhone("9811000001"), "+919811000001");
  assert.equal(normalizePhone("12345"), null);
});

test("every seeded scenario line extracts its scripted indicators", async () => {
  const { SCENARIOS } = await import("../lib/scenarios.js");
  for (const s of SCENARIOS) {
    const all = s.lines.flatMap((l) => extractEntities(l.text));
    assert.ok(all.some((e) => e.type === "UPI_ID"), `${s.id} should capture a UPI ID`);
    assert.ok(all.some((e) => e.type === "AMOUNT"), `${s.id} should capture an amount`);
    assert.ok(all.some((e) => e.type === "PHONE"), `${s.id} should capture a phone`);
  }
});

test("complaint draft is labelled unsubmitted", () => {
  const body = generateComplaint({ id: "c1", started_at: new Date().toISOString(), category: "Digital Arrest", risk_score: 90, summary: "s", source: "demo" }, []);
  assert.match(body, /NOT SUBMITTED/);
  assert.match(body, /cybercrime\.gov\.in/);
});

test("validators reject bad input", () => {
  assert.ok(validateCallInput({ category: "Nope", risk_score: 500 }).length >= 2);
  assert.ok(validateEntityInput({ type: "SECRET", value: "" }).length >= 1);
  assert.equal(validateEntityInput({ type: "UPI_ID", value: "demo@fakeupi" }).length, 0);
});

test("validators reject malformed entity values and non-object bodies", () => {
  assert.ok(validateEntityInput({ type: "UPI_ID", value: "not-a-upi" }).length >= 1);
  assert.ok(validateEntityInput({ type: "IFSC", value: "12345" }).length >= 1);
  assert.ok(validateEntityInput({ type: "PHONE", value: "hello world" }).length >= 1);
  assert.ok(validateEntityInput({ type: "BANK_ACCOUNT", value: "123" }).length >= 1);
  assert.ok(validateCallInput(null).length >= 1);
  assert.ok(validateCallInput({ transcript: 42 }).length >= 1);
  assert.ok(validateEndInput({ duration_sec: -5 }).length >= 1);
  assert.equal(validateEndInput({ duration_sec: 65, risk_score: 80 }).length, 0);
});

test("formatDuration and riskLevel guard bad numbers", () => {
  assert.equal(formatDuration(65), "01:05");
  assert.equal(formatDuration(0), "00:00");
  assert.equal(formatDuration("nonsense"), "00:00");
  assert.equal(riskLevel(92).label, "CRITICAL");
  assert.equal(riskLevel(Number.NaN).label, "LOW");
});

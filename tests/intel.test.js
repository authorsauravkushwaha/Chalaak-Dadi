import { test } from "node:test";
import assert from "node:assert";
import { extractEntities, generateComplaint, validateCallInput, validateEntityInput, formatDuration } from "../lib/intel.js";

test("extracts UPI, amount, account, IFSC", () => {
  const found = extractEntities("Send ₹4,85,000 to police.verify.demo@fakeupi account 000111222333 IFSC DEMO0001234");
  const types = found.map((e) => e.type);
  for (const t of ["UPI_ID", "AMOUNT", "BANK_ACCOUNT", "IFSC"]) assert.ok(types.includes(t), t);
});
test("extraction dedupes repeated values", () => {
  assert.equal(extractEntities("pay demo@fakeupi and again demo@fakeupi").filter((e) => e.type === "UPI_ID").length, 1);
});
test("complaint draft is labelled unsubmitted", () => {
  const body = generateComplaint({ id: "c1", started_at: new Date().toISOString(), category: "Digital Arrest", risk_score: 90, summary: "s", source: "demo" }, []);
  assert.match(body, /NOT SUBMITTED/);
  assert.match(body, /cybercrime\.gov\.in/);
});
test("validators reject bad input", () => {
  assert.ok(validateCallInput({ category: "Nope", risk_score: 500 }).length >= 2);
  assert.ok(validateEntityInput({ type: "SECRET", value: "" }).length >= 1);
  assert.equal(validateEntityInput({ type: "UPI_ID", value: "a@b" }).length >= 0, true);
});
test("formatDuration", () => { assert.equal(formatDuration(65), "01:05"); assert.equal(formatDuration(0), "00:00"); });

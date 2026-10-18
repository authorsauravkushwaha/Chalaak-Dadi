// Shared scam-intelligence helpers (pure functions — safe on server, tested in tests/intel.test.js)

export const CATEGORIES = [
  "Digital Arrest",
  "Parcel / Customs Fraud",
  "SIM / KYC Fraud",
  "Bank / OTP Fraud",
  "Investment Fraud",
  "Other / Unknown",
];

export const ENTITY_TYPES = ["UPI_ID", "PHONE", "BANK_ACCOUNT", "IFSC", "AMOUNT", "URL", "NAME"];

export const WHY_FLAGGED = {
  UPI_ID:
    "A personal UPI ID was shared during a pressure/threat conversation. Genuine police, customs or bank officers never ask you to pay a personal UPI ID.",
  PHONE:
    "Caller number disclosed in the conversation. Numbers used in fraud change frequently, so treat this as an indicator to verify — not proof of guilt.",
  BANK_ACCOUNT:
    "A bank-account number was offered for a 'verification' or 'refundable' transfer. Real authorities never collect money into personal accounts.",
  IFSC: "IFSC shared alongside an account number strengthens the money-trail indicator. It still requires official verification.",
  AMOUNT:
    "A specific money amount was demanded/threatened. Scam scripts use exact amounts to create urgency and panic.",
  URL: "A link was pushed during the call. Fraud links commonly imitate KYC or tracking pages to steal credentials.",
  NAME: "A name/identity was claimed by the caller. Claimed identities in scam calls are usually impersonation — verify independently.",
};

const trimPunctuation = (value) => String(value).replace(/[.,;:!?)\]}>'"]+$/g, "");

/** Normalise an Indian mobile number to +91XXXXXXXXXX, or return null. */
export function normalizePhone(raw = "") {
  const digits = String(raw).replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  if (/^0[6-9]\d{9}$/.test(digits)) return `+91${digits.slice(1)}`;
  return null;
}

function overlaps(spans, start, end) {
  return spans.some(([s, e]) => start < e && end > s);
}

/**
 * Extract likely scam indicators from a line of text (demo-grade regex extraction).
 *
 * Deliberately conservative fixes over naive regexes:
 *  - amounts as small as ₹10 are captured (a real case in the SIM/KYC scenario);
 *  - a bank-account number is never *also* reported as a phone number just
 *    because a 10-digit substring of it looks like a mobile;
 *  - e-mail addresses are not mislabelled as UPI IDs (UPI handles have no
 *    dotted domain), and trailing sentence punctuation is stripped;
 *  - phone numbers are normalised to +91XXXXXXXXXX so the same number
 *    written two ways dedupes to one indicator.
 */
export function extractEntities(text = "") {
  const src = String(text ?? "");
  const found = [];
  const claimed = []; // [start, end) spans already explained by a stronger type
  const push = (type, value, confidence, start, end) => {
    const v = String(value ?? "").trim();
    if (!v) return;
    if (found.some((e) => e.type === type && e.value.toLowerCase() === v.toLowerCase())) return;
    found.push({ type, value: v, confidence, evidence: src.slice(0, 220) });
    if (start != null) claimed.push([start, end]);
  };

  // IFSC first — it is alphanumeric and would otherwise leak digit substrings.
  for (const m of src.matchAll(/\b[A-Z]{4}0[A-Z0-9]{6}\b/g)) push("IFSC", m[0], 0.9, m.index, m.index + m[0].length);

  // URLs (claim their span so a UPI/e-mail inside a link is not double counted).
  for (const m of src.matchAll(/https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/gi)) {
    const value = trimPunctuation(m[0]);
    if (value) push("URL", value, 0.86, m.index, m.index + m[0].length);
  }

  // UPI IDs. A dotted suffix (name@bank.com) is an e-mail address, not a UPI handle.
  for (const m of src.matchAll(/[\w.\-]{2,}@[a-zA-Z][a-zA-Z0-9.]*/g)) {
    if (overlaps(claimed, m.index, m.index + m[0].length)) continue;
    const value = trimPunctuation(m[0]);
    const handle = value.split("@")[1] || "";
    if (!value.includes("@") || handle.includes(".") || handle.length < 2) continue;
    push("UPI_ID", value, 0.93, m.index, m.index + m[0].length);
  }

  // Phone numbers — never inside a longer digit run (bank accounts etc.).
  for (const m of src.matchAll(/(?<!\d)(?:\+91[\s-]?|91[\s-]?|0[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g)) {
    if (overlaps(claimed, m.index, m.index + m[0].length)) continue;
    const value = normalizePhone(m[0]);
    if (value) push("PHONE", value, 0.88, m.index, m.index + m[0].length);
  }

  // Amounts — including small ones such as ₹10 / Rs. 500 / INR 1000.
  for (const m of src.matchAll(/(?:₹|Rs\.?|INR)\s?\d[\d,]*(?:\.\d{1,2})?/gi)) {
    push("AMOUNT", trimPunctuation(m[0]).replace(/,$/, ""), 0.82, m.index, m.index + m[0].length);
  }

  // Bank accounts — but a 91-prefixed mobile number is a phone, not an account.
  for (const m of src.matchAll(/(?<!\d)\d{11,18}(?!\d)/g)) {
    if (overlaps(claimed, m.index, m.index + m[0].length)) continue;
    if (normalizePhone(m[0])) continue;
    push("BANK_ACCOUNT", m[0], 0.8, m.index, m.index + m[0].length);
  }

  return found;
}

export function riskLevel(score = 0) {
  const n = Number(score);
  const s = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
  if (s >= 85) return { label: "CRITICAL", color: "#f87171" };
  if (s >= 65) return { label: "HIGH", color: "#fb923c" };
  if (s >= 40) return { label: "MEDIUM", color: "#facc15" };
  return { label: "LOW", color: "#4ade80" };
}

export function formatDuration(sec = 0) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Build a structured, clearly-unsubmitted complaint draft from recorded evidence. */
export function generateComplaint(call, entities = []) {
  const when = call.started_at ? new Date(call.started_at).toLocaleString("en-IN") : "Not recorded";
  const lines = [
    "============================================================",
    "  DRAFT COMPLAINT — NOT SUBMITTED (मानव समीक्षा हेतु ड्राफ्ट)",
    "  Prepared by: Chalaak Dadi — Scam Intelligence Console (Demo)",
    "  Team: SK Nexora | Event: Srijan Setu 2026",
    "============================================================",
    "",
    "STATUS: This is an UNSUBMITTED draft prepared for human review.",
    "No police complaint has been filed, no account has been frozen,",
    "and no criminal activity has been verified by this system.",
    "All extracted details below are INDICATORS / आरोप requiring",
    "official verification — they are not proof of guilt.",
    "",
    "1) INCIDENT DETAILS",
    `   Date/Time of call : ${when}`,
    `   Call reference ID : ${call.id}`,
    `   Suspected category: ${call.category || "Other / Unknown"}`,
    `   Risk score        : ${call.risk_score ?? "—"} / 100`,
    `   Data source       : ${call.source === "demo" ? "DEMO / simulated record" : "Live ingestion"}`,
    "",
    "2) WHAT HAPPENED (Narrative)",
    `   ${call.summary || "Summary not recorded."}`,
    "",
    "3) EXTRACTED INDICATORS (evidence from the conversation)",
    ...(entities.length
      ? entities.map((e, i) => `   ${i + 1}. [${e.type}] ${e.value}  (confidence ${Math.round((e.confidence || 0) * 100)}%)\n      Evidence: "${e.evidence || "—"}"`)
      : ["   No indicators were extracted for this call."]),
    "",
    "4) REQUEST TO THE AUTHORITY",
    "   Please verify the above indicators, examine the money trail if",
    "   any transfer occurred, and take action as per law. The complainant",
    "   is available to provide the full recording/transcript.",
    "",
    "5) WHERE TO FILE (official)",
    "   National Cyber Crime Portal: https://cybercrime.gov.in",
    "   Helpline (India): 1930",
    "",
    "— End of draft. Review carefully before submitting anywhere. —",
  ];
  return lines.join("\n");
}

function isPlainObject(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function checkText(errors, body, field, max) {
  if (body[field] != null && typeof body[field] !== "string") errors.push(`${field} must be a string`);
  else if (body[field] != null && body[field].length > max) errors.push(`${field} too long (max ${max} chars)`);
}

function checkRisk(errors, body) {
  if (body.risk_score != null && (typeof body.risk_score === "boolean" || Number.isNaN(Number(body.risk_score)) || Number(body.risk_score) < 0 || Number(body.risk_score) > 100))
    errors.push("risk_score must be a number between 0 and 100");
}

export function validateCallInput(body = {}) {
  if (!isPlainObject(body)) return ["request body must be a JSON object"];
  const errors = [];
  if (body.category != null && typeof body.category !== "string") errors.push("category must be a string");
  else if (body.category && !CATEGORIES.includes(body.category)) errors.push(`category must be one of: ${CATEGORIES.join(", ")}`);
  checkRisk(errors, body);
  checkText(errors, body, "transcript", 50000);
  checkText(errors, body, "summary", 2000);
  checkText(errors, body, "caller", 120);
  checkText(errors, body, "client_event_id", 120);
  return errors;
}

/** Validation for end-of-call patches (protected + demo end endpoints). */
export function validateEndInput(body = {}) {
  if (!isPlainObject(body)) return ["request body must be a JSON object"];
  const errors = validateCallInput(body);
  if (body.duration_sec != null && (Number.isNaN(Number(body.duration_sec)) || Number(body.duration_sec) < 0 || Number(body.duration_sec) > 86400))
    errors.push("duration_sec must be a number between 0 and 86400");
  return errors;
}

const ENTITY_FORMATS = {
  UPI_ID: /^[\w.\-]{2,}@[a-zA-Z][a-zA-Z0-9]{1,}$/,
  IFSC: /^[A-Z]{4}0[A-Z0-9]{6}$/i,
  BANK_ACCOUNT: /^\d{11,18}$/,
  URL: /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i,
};

export function validateEntityInput(body = {}) {
  if (!isPlainObject(body)) return ["request body must be a JSON object"];
  const errors = [];
  if (!ENTITY_TYPES.includes(body.type)) {
    errors.push(`type must be one of: ${ENTITY_TYPES.join(", ")}`);
    return errors;
  }
  const value = body.value == null ? "" : String(body.value).trim();
  if (!value || value.length < 3 || value.length > 120) errors.push("value is required (3–120 chars)");
  else if (body.type === "PHONE" && !normalizePhone(value)) errors.push("value must be a valid Indian mobile number");
  else if (ENTITY_FORMATS[body.type] && !ENTITY_FORMATS[body.type].test(value)) errors.push(`value is not a valid ${body.type}`);
  else if (body.type === "AMOUNT" && !/(?:₹|Rs\.?|INR)?\s?\d/.test(value)) errors.push("value must contain an amount");
  if (body.evidence != null && typeof body.evidence !== "string") errors.push("evidence must be a string");
  if (body.confidence != null && (typeof body.confidence === "boolean" || Number.isNaN(Number(body.confidence)) || Number(body.confidence) < 0 || Number(body.confidence) > 1))
    errors.push("confidence must be between 0 and 1");
  return errors;
}

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

/** Extract likely scam indicators from a line of text (demo-grade regex extraction). */
export function extractEntities(text = "") {
  const found = [];
  const push = (type, value, confidence) => {
    if (value && !found.some((e) => e.type === type && e.value.toLowerCase() === String(value).toLowerCase()))
      found.push({ type, value: String(value), confidence, evidence: String(text).slice(0, 220) });
  };
  for (const m of String(text).matchAll(/[\w.\-]{2,}@[a-zA-Z]{2,}/g)) if (!m[0].includes(" ")) push("UPI_ID", m[0], 0.93);
  for (const m of String(text).matchAll(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/g)) push("PHONE", m[0].replace(/[\s-]/g, ""), 0.88);
  for (const m of String(text).matchAll(/[A-Z]{4}0[A-Z0-9]{6}/g)) push("IFSC", m[0], 0.9);
  for (const m of String(text).matchAll(/https?:\/\/[^\s]+|www\.[^\s]+/gi)) push("URL", m[0], 0.86);
  for (const m of String(text).matchAll(/(?:₹|Rs\.?|INR)\s?[\d,]{3,}/gi)) push("AMOUNT", m[0], 0.82);
  for (const m of String(text).matchAll(/\b\d{11,18}\b/g)) push("BANK_ACCOUNT", m[0], 0.8);
  return found;
}

export function riskLevel(score = 0) {
  if (score >= 85) return { label: "CRITICAL", color: "#f87171" };
  if (score >= 65) return { label: "HIGH", color: "#fb923c" };
  if (score >= 40) return { label: "MEDIUM", color: "#facc15" };
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

export function validateCallInput(body = {}) {
  const errors = [];
  if (body.category && !CATEGORIES.includes(body.category)) errors.push(`category must be one of: ${CATEGORIES.join(", ")}`);
  if (body.risk_score != null && (Number.isNaN(Number(body.risk_score)) || body.risk_score < 0 || body.risk_score > 100))
    errors.push("risk_score must be a number between 0 and 100");
  if (body.transcript != null && String(body.transcript).length > 50000) errors.push("transcript too long (max 50000 chars)");
  if (body.summary != null && String(body.summary).length > 2000) errors.push("summary too long (max 2000 chars)");
  return errors;
}

export function validateEntityInput(body = {}) {
  const errors = [];
  if (!ENTITY_TYPES.includes(body.type)) errors.push(`type must be one of: ${ENTITY_TYPES.join(", ")}`);
  if (!body.value || String(body.value).trim().length < 3 || String(body.value).length > 120) errors.push("value is required (3–120 chars)");
  if (body.confidence != null && (Number.isNaN(Number(body.confidence)) || body.confidence < 0 || body.confidence > 1))
    errors.push("confidence must be between 0 and 1");
  return errors;
}

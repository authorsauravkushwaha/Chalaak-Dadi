export const metadata = { title: "About & Methodology — Chalaak Dadi" };

const S = ({ children }) => <div className="card" style={{ marginBottom: 16 }}>{children}</div>;

export default function About() {
  return (
    <>
      <h1>ℹ️ About &amp; Methodology</h1>
      <p className="sub">Chalaak Dadi — Scam Intelligence Console · Team <b>SK Nexora</b> · Srijan Setu 2026</p>

      <S><h2>🎯 The problem</h2>
        <p>India loses thousands of crores to phone-based financial fraud — “digital arrest”, fake customs/parcel, SIM-KYC and OTP scams. Victims are often elderly, Hindi-speaking, and pressured to act within minutes. While a scammer is busy talking, they cannot scam someone else — and every minute of conversation can reveal UPI IDs, phone numbers and bank accounts that investigators need.</p></S>

      <S><h2>👥 Intended users</h2>
        <p>Cyber-cell analysts and volunteers reviewing suspected scam calls, community awareness teams, hackathon judges evaluating the concept, and (in future) telecom/bank fraud desks receiving verified indicator feeds.</p></S>

      <S><h2>⚙️ How the system works</h2>
        <ol>
          <li><b>Engage:</b> A sweet, slightly forgetful Hindi-speaking “Dadi” voice persona keeps the suspected caller talking (in this prototype: a clearly-labelled simulated Demo Adapter — no real telephony).</li>
          <li><b>Extract:</b> The conversation is scanned for indicators — UPI IDs, phone numbers, bank accounts, IFSC codes, amounts and links — each stored with confidence and the exact evidence line.</li>
          <li><b>Display:</b> The Live Intelligence console streams the transcript, fires entity alerts, runs the engagement timer, and the Dashboard aggregates categories, risk and captured entities from the database.</li>
          <li><b>Draft:</b> A structured complaint draft is generated from recorded evidence for a human to review, copy, download, and — only if they choose — file on <b>cybercrime.gov.in</b> or helpline <b>1930</b>.</li>
        </ol></S>

      <S><h2>⚠️ Limitations (honest list)</h2>
        <ul>
          <li>The voice agent, calls and transcripts in this build are <b>simulated</b>; no real scam caller is engaged.</li>
          <li>Entity extraction is rule-based (patterns), not a trained ML model — it can miss cleverly-spoken details (“nine eight one…”) and can false-positive.</li>
          <li>Risk scores in demo records are illustrative, assigned per scenario.</li>
          <li>Extracted details are <b>allegations/indicators</b>. Only lawful investigation can establish guilt.</li>
          <li>Without a configured PostgreSQL database (<code>DATABASE_URL</code>), records on Vercel live in <b>temporary server memory</b> and may reset to the 3 seed cases when instances recycle. The Dashboard banner and <code>/api/health</code> always show which mode is active — see <code>docs/PERSISTENCE.md</code> in the repository for the free Neon setup.</li>
        </ul></S>

      <S><h2>🔒 Privacy safeguards</h2>
        <ul>
          <li>Fictional test data by default; never enter real victims’ personal or financial details into the demo.</li>
          <li>Secrets (database URL, ingestion secret) live only in server-side environment variables — never in browser code or git.</li>
          <li>Ingestion APIs reject unauthenticated requests; duplicate events/entities are ignored (idempotent).</li>
          <li>Data minimisation: the schema stores only what the workflow needs, and every report is labelled unsubmitted.</li>
        </ul></S>

      <S><h2>🚀 Future deployment plan</h2>
        <ol>
          <li>Connect a real telephony + speech pipeline (STT/TTS with a Hindi voice) behind the same API contracts, with consent and legal review.</li>
          <li>Move extraction to an ML/NLP service, add speaker diarisation and language detection.</li>
          <li>Add analyst roles/login, indicator sharing with banks/telecom under due process, and deployment on managed PostgreSQL with backups.</li>
        </ol>
        <p className="small muted">This prototype never claims to have contacted police, frozen an account, verified criminal activity, or filed a report.</p></S>
    </>
  );
}

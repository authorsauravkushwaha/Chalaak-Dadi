export const metadata = { title: "About & Methodology — Chalaak Dadi" };

const sections = [
  {
    title: "What this prototype demonstrates",
    content: <p>Chalaak Dadi is a scam-awareness and intelligence-review concept. A fictional caller and a scripted Dadi persona play through a sample conversation; simple extraction rules highlight values such as UPI IDs, phone numbers, bank-account indicators, amounts, and links. A reviewer can inspect the saved call record and prepare an unsubmitted complaint draft.</p>,
  },
  {
    title: "How the demonstration works",
    content: (
      <ol>
        <li><b>Select a scenario.</b> Choose one of the fictional scripts on Live Intelligence.</li>
        <li><b>Follow the transcript.</b> Lines play in sequence. The engagement timer measures elapsed time in the browser demonstration only.</li>
        <li><b>Review pattern matches.</b> Extracted values are attached to the call record with evidence and a confidence value.</li>
        <li><b>Prepare a draft.</b> A saved draft can be inspected, copied, downloaded, and marked reviewed. It is never submitted by the application.</li>
      </ol>
    ),
  },
  {
    title: "Method and limits",
    content: (
      <ul>
        <li>All built-in callers, dialogue, phone numbers, account details, and payment handles are fictional examples.</li>
        <li>No real calls, audio, AI voice, telephony provider, police contact, account freeze, or complaint filing is connected.</li>
        <li>Entity extraction uses transparent pattern rules. It can miss spoken or unusual formats and can produce false matches.</li>
        <li>Risk values in the built-in scenarios are illustrative labels, not validated or predictive assessments. A partial transcript may retain its scenario's assigned value.</li>
        <li>An extracted detail is an indicator for human verification, not proof of guilt.</li>
      </ul>
    ),
  },
  {
    title: "Data handling",
    content: (
      <ul>
        <li>The dashboard's storage notice and <code>/api/health</code> describe the active persistence mode.</li>
        <li>Without PostgreSQL configuration, demo records use the app's local or temporary demo storage and may not be durable in hosted environments.</li>
        <li>Do not enter personal or financial details from real victims into this prototype. Any real-world use would require consent, legal review, access controls, and a retention policy.</li>
        <li>Ingestion endpoints and database behavior are documented in the repository's API and persistence guides.</li>
      </ul>
    ),
  },
];

export default function About() {
  return (
    <div className="page-stack about-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-mark" />The idea and its boundaries</p>
          <h1>About &amp; methodology</h1>
          <p className="page-lede">A transparent prototype for exploring how scripted engagement and rule-based indicator review could fit into a defensive workflow.</p>
        </div>
        <span className="pill demo page-heading-badge">PROTOTYPE · FICTIONAL DATA</span>
      </section>

      <section className="about-banner card">
        <div><span className="eyebrow">Designed for review, not automation</span><h2>Scripted by design. Transparent by default.</h2></div>
        <p>Every value shown by the built-in scenarios is fictional. A person remains responsible for checking the evidence and deciding whether to take any next step.</p>
      </section>

      <div className="methodology-grid">
        {sections.map((section, index) => (
          <section className={`card methodology-card methodology-card-${index + 1}`} key={section.title}>
            <div className="methodology-number">0{index + 1}</div>
            <h2>{section.title}</h2>
            {section.content}
          </section>
        ))}
      </div>

      <section className="card help-card">
        <div><p className="eyebrow">If someone is facing fraud</p><h2>Use official channels</h2><p>For a cyber-fraud emergency in India, call the national helpline or use the official portal.</p></div>
        <div className="rowflex"><a className="btn" href="tel:1930">Call 1930</a><a className="btn btn-outline" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">Visit cybercrime.gov.in <span aria-hidden="true">↗</span></a></div>
      </section>

      <p className="about-credit">Chalaak Dadi · Team <b>SK Nexora</b> · Srijan Setu 2026</p>
    </div>
  );
}

import { notFound } from "next/navigation";
import { getCall, listAudit } from "../../../../lib/db.js";
import { t } from "../../../../lib/i18n.js";
import CallDetail from "./CallDetail.jsx";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return { title: t(lang, "callDetail.title") };
}

/**
 * Server-rendered: the call record and audit trail are fetched directly from
 * the database layer (no internal HTTP hop), then handed to the client
 * component for interactive draft generation.
 */
export default async function CallPage({ params }) {
  const { lang, id } = await params;
  const call = await getCall(id);
  if (!call) notFound();
  const audit = await listAudit(id);
  return <CallDetail lang={lang} call={JSON.parse(JSON.stringify(call))} audit={JSON.parse(JSON.stringify(audit))} />;
}

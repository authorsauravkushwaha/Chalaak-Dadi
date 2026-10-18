// Tiny browser helpers shared by pages.
export async function api(path, options) {
  const res = await fetch(path, { cache: "no-store", ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
export function downloadText(filename, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
export async function copyText(text, setMsg) {
  try { await navigator.clipboard.writeText(text); setMsg?.("✅ Copied to clipboard."); }
  catch { setMsg?.("Copy failed — select the text manually."); }
}

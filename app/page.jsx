import { redirect } from "next/navigation";

// Middleware normally redirects "/" to the negotiated language route.
// This static redirect is the safety net when middleware does not run.
export default function Root() {
  redirect("/en");
}

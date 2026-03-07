import { redirect } from "next/navigation";

export default function TermsRedirect() {
  redirect("/help/terms");
}

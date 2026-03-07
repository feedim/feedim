import { redirect } from "next/navigation";

export default function PrivacyRedirect() {
  redirect("/help/privacy");
}

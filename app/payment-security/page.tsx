import { redirect } from "next/navigation";

export default function PaymentSecurityRedirect() {
  redirect("/help/payment-security");
}

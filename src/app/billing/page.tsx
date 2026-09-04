import { redirect } from "next/navigation";

export default function BillingRedirectPage() {
  redirect("/payments");
}

import { redirect } from "next/navigation";

export default function RefundPolicyPage() {
  redirect("/terms-conditions?tab=refunds");
}

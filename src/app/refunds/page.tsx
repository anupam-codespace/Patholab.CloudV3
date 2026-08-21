import { redirect } from "next/navigation";

export default function RefundsPage() {
  redirect("/terms-conditions?tab=refunds");
}

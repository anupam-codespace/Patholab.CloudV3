import { redirect } from "next/navigation";

export default function PrivacyPage() {
  redirect("/terms-conditions?tab=privacy");
}

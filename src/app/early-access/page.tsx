import { redirect } from "next/navigation";

export default function EarlyAccessRedirectPage() {
  redirect("/plans");
}

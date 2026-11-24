import { redirect } from "next/navigation";

export default function PaymentProviderSettingsRedirectPage() {
  redirect("/superadmin/integrations");
}

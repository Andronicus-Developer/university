import { redirect } from "next/navigation";

export default function SuperAdminRootRedirect() {
  redirect("/superadmin/dashboard");
}

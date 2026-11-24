import { FinanceRedirectPage } from "@/components/portals/FinanceRedirectPage";
export default function LegacyFinanceAuditRedirect() {
  return <FinanceRedirectPage to="/finance/reports" label="Redirecting to Financial Reports..." />;
}

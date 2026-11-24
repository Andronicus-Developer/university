import { FinanceRedirectPage } from "@/components/portals/FinanceRedirectPage";
export default function LegacyFinanceApprovalQueueRedirect() {
  return <FinanceRedirectPage to="/finance/dashboard" label="Redirecting to Finance Dashboard..." />;
}

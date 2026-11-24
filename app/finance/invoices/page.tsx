import { FinanceRedirectPage } from "@/components/portals/FinanceRedirectPage";
export default function LegacyInvoicesRedirect() {
  return <FinanceRedirectPage to="/finance/fee-structures" label="Redirecting to Fee Structures & Billing..." />;
}

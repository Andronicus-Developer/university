import { FinanceRedirectPage } from "@/components/portals/FinanceRedirectPage";
export default function LegacyPaymentsRedirect() {
  return <FinanceRedirectPage to="/finance/collect" label="Redirecting to Collect Fees & Receipts..." />;
}

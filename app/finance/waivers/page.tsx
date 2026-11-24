import { FinanceRedirectPage } from "@/components/portals/FinanceRedirectPage";
export default function LegacyFinanceWaiversRedirect() {
  return <FinanceRedirectPage to="/finance/balances" label="Redirecting to Student Balances..." />;
}

import { FinanceRedirectPage } from "@/components/portals/FinanceRedirectPage";
export default function LegacyOutstandingRedirect() {
  return <FinanceRedirectPage to="/finance/balances" label="Redirecting to Student Balances & Debtors..." />;
}

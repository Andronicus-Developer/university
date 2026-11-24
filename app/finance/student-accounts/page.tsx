import { FinanceRedirectPage } from "@/components/portals/FinanceRedirectPage";
export default function LegacyStudentAccountsRedirect() {
  return <FinanceRedirectPage to="/finance/balances" label="Redirecting to Student Balances & Debtors..." />;
}

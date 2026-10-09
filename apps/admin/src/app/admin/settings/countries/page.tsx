import { requireSession } from "@/lib/auth/session";
import { listAdminCountries } from "@/features/admin-countries/repository";
import { CountryManagement } from "@/components/admin/countries/country-management";

export default async function CountriesPage() {
  await requireSession();
  return <CountryManagement countries={await listAdminCountries()} />;
}

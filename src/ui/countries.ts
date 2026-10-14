import type { Brand, BrandRegion } from "./brands.js";

export const countries = [
  { code: "mx", name: "México", flag: "🇲🇽" },
  { code: "co", name: "Colombia", flag: "🇨🇴" },
  { code: "pe", name: "Perú", flag: "🇵🇪" },
  { code: "br", name: "Brasil", flag: "🇧🇷" },
  { code: "ke", name: "Kenia", flag: "🇰🇪" },
  { code: "ng", name: "Nigeria", flag: "🇳🇬" },
  { code: "in", name: "India", flag: "🇮🇳" },
  { code: "uk", name: "Reino Unido", flag: "🇬🇧" },
  { code: "global", name: "Global", flag: "🌐" }
] as const;

export function findCountry(value: unknown) {
  if (typeof value !== "string") return undefined;
  const key = value.trim().toLocaleLowerCase("es");
  return countries.find(country => country.code === key || country.name.toLocaleLowerCase("es") === key || (key === "gl" && country.code === "global"));
}

export function groupCountries<R extends BrandRegion>(brands: Array<Omit<Brand, "regions"> & { regions: R[] }>) {
  return countries.map(country => ({
    ...country,
    displayCode: country.code === "global" ? "GL" : country.code.toUpperCase(),
    brands: brands.flatMap(brand => brand.regions.filter(region => region.code === country.code)
      .map(region => ({ id: brand.id, name: brand.regions.length > 1 && country.code !== "global" ? `${brand.name} ${country.code.toUpperCase()}` : brand.name, sport: brand.sport, ...(brand.note ? { note: brand.note } : {}), region })))
  }));
}

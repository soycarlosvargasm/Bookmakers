import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export type BrandRegion = { code: string; name: string; url: string; vpn: string | null; verified: boolean };
export type Brand = { id: string; name: string; sport: string; note?: string; regions: BrandRegion[] };

export async function loadBrands(): Promise<Brand[]> {
  const data = JSON.parse(await readFile(resolve("config/brands.json"), "utf8")) as { brands: Brand[] };
  return data.brands;
}

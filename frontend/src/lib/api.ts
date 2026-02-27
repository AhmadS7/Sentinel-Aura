export interface RegionPrice {
  region: string;
  price: number;
}

const API_BASE = "http://localhost:8080/api";

export async function fetchPrices(): Promise<RegionPrice[]> {
  try {
    const res = await fetch(`${API_BASE}/prices`);
    if (!res.ok) throw new Error("Failed to fetch prices");
    return res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function migrateWorkload(sourceRegion: string, targetRegion: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/migrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceRegion, targetRegion }),
    });
    return res.ok;
  } catch (err) {
    console.error(err);
    return false;
  }
}

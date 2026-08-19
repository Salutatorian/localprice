import { createHash } from "node:crypto";
import { getServerEnv } from "@/lib/env";
import { flags } from "@/lib/flags";

export type PlaceMatch = {
  placeId: string | null;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  businessStatus: string | null;
  phone: string | null;
};

export function cacheKey(marketId: string, query: string): string {
  return createHash("sha256").update(`${marketId}:${query.toLowerCase()}`).digest("hex");
}

export async function searchPlaces(args: {
  query: string;
  marketName: string;
}): Promise<PlaceMatch[]> {
  const env = getServerEnv();
  if (!flags().googlePlaces || !env.GOOGLE_PLACES_API_KEY) {
    return [];
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.businessStatus",
    },
    body: JSON.stringify({
      textQuery: `${args.query} ${args.marketName}`,
      maxResultCount: 5,
    }),
  });

  if (!response.ok) {
    throw new Error("Google Places lookup failed.");
  }

  const payload = (await response.json()) as {
    places?: Array<{
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
      businessStatus?: string;
    }>;
  };

  return (payload.places ?? []).map((place) => ({
    placeId: place.id,
    name: place.displayName?.text ?? args.query,
    address: place.formattedAddress ?? null,
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    businessStatus: place.businessStatus ?? null,
    phone: null,
  }));
}

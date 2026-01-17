interface Location {
  id: string;
  name: string;
  fulfillsOnlineOrders: boolean;
  isActive: boolean;
}

interface LocationsResponse {
  data: {
    locations: {
      nodes: Location[];
    };
  };
}

export const LOCATIONS_QUERY = `
  query GetLocations {
    locations(first: 50) {
      nodes {
        id
        name
        fulfillsOnlineOrders
        isActive
      }
    }
  }
`;

/**
 * Fetch store locations and return nodes array
 */
export async function fetchLocations(client: any): Promise<Location[]> {
  console.log("Fetching locations...");
  
  const resp: LocationsResponse = await client.request(LOCATIONS_QUERY);
  return resp?.data?.locations?.nodes ?? [];
}

/**
 * Pick a location id (customize the selection logic here)
 */
export function pickLocationId(locations: Location[]): string | null {
  // Pick first active location, or first available if none active
  const chosen = locations.find(l => l.isActive) || locations[0];
  return chosen?.id || null;
}
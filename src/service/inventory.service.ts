import shopify from "../shopify.js";
import { Session } from "@shopify/shopify-api";

interface InventoryUpdate {
  sku: string;
  quantity: number;
}

interface SkuToIdMap {
  [sku: string]: string;
}

interface UserError {
  field: string[];
  message: string;
}

interface InventoryChange {
  name: string;
  delta: number;
}

interface InventoryAdjustmentGroup {
  createdAt: string;
  reason: string;
  referenceDocumentUri: string;
  changes: InventoryChange[];
}

interface SetInventoryResult {
  ok: boolean;
  updatedCount?: number;
  missingSkus?: string[];
  userErrors?: UserError[];
  results?: any[];
  message?: string;
}

interface ProductVariantEdge {
  node: {
    sku: string;
    inventoryItem: {
      id: string;
    };
  };
}

function chunkArray<T>(arr: T[], size = 50): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function toInt(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

async function getInventoryItemIdsBySkus(
  client: any,
  skus: string[]
): Promise<SkuToIdMap> {
  const query = `
    query ($query: String!) {
      productVariants(first: 50, query: $query) {
        edges {
          node {
            sku
            inventoryItem { id }
          }
        }
      }
    }
  `;

  const skuToIdMap: SkuToIdMap = {};

  // Normalize, deduplicate, and chunk SKUs
  const uniqueSkus = [...new Set(
    skus.map(s => String(s ?? "").trim()).filter(Boolean)
  )];
  const chunks = chunkArray(uniqueSkus, 50);

  // Process chunks with Promise.all for better performance
  await Promise.all(
    chunks.map(async (skuChunk) => {
      const searchQuery = skuChunk.map(sku => `sku:${sku}`).join(" OR ");

      const response = await client.request(query, {
        variables: { query: searchQuery },
      });

      const edges: ProductVariantEdge[] = response?.data?.productVariants?.edges ?? [];
      
      edges.forEach(edge => {
        const { sku, inventoryItem } = edge.node;
        if (sku && inventoryItem?.id) {
          skuToIdMap[sku] = inventoryItem.id;
        }
      });
    })
  );

  return skuToIdMap;
}

export async function setInventoryBySkus({
  session,
  locationId,
  updates,
}: {
  session: Session;
  locationId: string;
  updates: InventoryUpdate[];
}): Promise<SetInventoryResult> {
  const client = new shopify.api.clients.Graphql({ session });

  if (!Array.isArray(updates) || updates.length === 0) {
    console.log("No updates provided.");
    return { ok: false, message: "No updates provided." };
  }

  // Normalize and validate input
  const normalizedUpdates = updates
    .map(u => ({
      sku: String(u?.sku ?? "").trim(),
      quantity: toInt(u?.quantity),
    }))
    .filter((u): u is { sku: string; quantity: number } => 
      Boolean(u.sku && u.quantity !== null)
    );

  if (!normalizedUpdates.length) {
    console.log("No valid updates after normalization.");
    return { ok: false, message: "No valid updates after normalization." };
  }

  // Resolve inventoryItemId for each SKU
  const skus = normalizedUpdates.map(u => u.sku);
  const skuToIdMap = await getInventoryItemIdsBySkus(client, skus);

  // Filter valid SKUs and identify missing ones
  const finalUpdates = normalizedUpdates.filter(u => skuToIdMap[u.sku]);
  const missingSkus = normalizedUpdates
    .filter(u => !skuToIdMap[u.sku])
    .map(u => u.sku);

  if (!finalUpdates.length) {
    console.log("No matching SKUs found in Shopify.");
    return {
      ok: false,
      message: "No matching SKUs found in Shopify.",
      missingSkus,
    };
  }

  // GraphQL mutation
  const mutation = `
    mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
        userErrors { field message }
        inventoryAdjustmentGroup {
          createdAt
          reason
          referenceDocumentUri
          changes { name delta }
        }
      }
    }
  `;

  // Send updates in batches
  const updateChunks = chunkArray(finalUpdates, 100);
  const results: any[] = [];
  const allUserErrors: UserError[] = [];

  // Process batches in parallel for better performance
  await Promise.all(
    updateChunks.map(async (part) => {
      const variables = {
        input: {
          name: "on_hand",
          reason: "correction",
          ignoreCompareQuantity: true,
          quantities: part.map(u => ({
            inventoryItemId: skuToIdMap[u.sku],
            locationId,
            quantity: Math.max(0, u.quantity),
          })),
        },
      };

      try {
        const response = await client.request(mutation, { variables });
        const payload = response?.data?.inventorySetQuantities;
        const userErrors = payload?.userErrors ?? [];

        if (userErrors.length) {
          allUserErrors.push(...userErrors);
        }

        results.push(payload);
      } catch (error) {
        console.error("GraphQL Error:", error);
        throw error;
      }
    })
  );

  return {
    ok: allUserErrors.length === 0,
    updatedCount: finalUpdates.length,
    missingSkus,
    userErrors: allUserErrors,
    results,
  };
}
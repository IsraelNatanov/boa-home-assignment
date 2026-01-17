import { readSheetCsv } from "../utils/readSheet.js";


interface SheetRow {
  "Variant SKU"?: string;
  "Variant Inventory Qty"?: string | number;
}

interface InventoryUpdate {
  sku: string;
  quantity: number;
}

/**
 * Build inventory updates from sheet rows
 * Expected columns: Variant SKU, Variant Inventory Qty
 */
export async function getUpdatesFromSheet(): Promise<InventoryUpdate[]> {
  const rows: SheetRow[] = await readSheetCsv();

  const updates = rows
    .map(row => ({
      sku: String(row?.["Variant SKU"] ?? "").trim(),
      quantity: Number(row?.["Variant Inventory Qty"]),
    }))
    .filter((u): u is InventoryUpdate => 
      Boolean(u.sku && Number.isFinite(u.quantity))
    );

  return updates;
}
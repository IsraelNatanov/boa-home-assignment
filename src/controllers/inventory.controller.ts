import { Request, Response, NextFunction } from "express";
import shopify from "../shopify.js";
import { setInventoryBySkus } from "../service/inventory.service.js";
import { getUpdatesFromSheet } from "../service/sheet.service.js";
import { fetchLocations, pickLocationId } from "../service/locations.service.js";

/**
 * Server-driven inventory update:
 * - locationId is fetched from Shopify
 * - updates are fetched from the sheet/CSV
 */
export async function updateInventoryFromSheetController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = res.locals?.shopify?.session;
    
    if (!session) {
      res.status(401).json({ 
        ok: false, 
        message: "Unauthorized (missing session)." 
      });
      return;
    }

    const client = new shopify.api.clients.Graphql({ session });

    // Get locationId from Shopify
    const locations = await fetchLocations(client);
    console.log("locations", locations);
    
    const locationId = pickLocationId(locations);

    if (!locationId) {
      res.status(400).json({ 
        ok: false, 
        message: "No locations found on this store." 
      });
      return;
    }

    // Read updates from sheet
    const updates = await getUpdatesFromSheet();
    
    if (!updates.length) {
      res.status(400).json({ 
        ok: false, 
        message: "No valid updates found in the sheet." 
      });
      return;
    }

    // Apply inventory update
    const result = await setInventoryBySkus({ session, locationId, updates });

    res.json({
      ...result,
      locationId,
      locationCount: locations.length,
      updatesFromSheet: updates.length,
    });
  } catch (err) {
    next(err);
  }
}
import { Router } from "express";
import { updateInventoryFromSheetController } from "../../controllers/inventory.controller.js";

const router = Router();

// You can plug auth middleware here if needed
router.post("/update-from-sheet", updateInventoryFromSheetController);

export default router;
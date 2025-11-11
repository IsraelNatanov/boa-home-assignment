import { Router } from "express";
import { saveCartController } from "../../controllers/saveCartController.js";

const router = Router();

// POST /api/save-cart
router.post("/save-cart", saveCartController.save);

export default router;

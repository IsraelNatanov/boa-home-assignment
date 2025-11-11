import type { Request, Response, NextFunction, RequestHandler } from "express";
import { prisma } from "../libs/prisma/index.js";

type SaveCartItemInput = {
  lineId: string;
  productId: string;
  title: string;
  quantity: number;
};

const save: RequestHandler = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const { items } = req.body as { items?: SaveCartItemInput[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "No items to save" });
      return;
    }

    const session = (res.locals as any).shopify?.session;
    const shop = session?.shop as string | undefined;

    if (!shop) {
      res.status(401).json({ error: "Invalid shop session" });
      return;
    }

    await prisma.savedCartItem.createMany({
      data: items.map((item) => ({
        shop,
        lineId: item.lineId,
        productId: item.productId,
        title: item.title,
        quantity: item.quantity,
      })),
    });

    console.log("items", items);

    res.json({ ok: true });
  } catch (error) {
    console.error("Failed to save cart items", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const saveCartController = { save };

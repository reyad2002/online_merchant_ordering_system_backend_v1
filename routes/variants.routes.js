import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import {
  requireAuth,
  requireMerchant,
  requireCanEditMenu,
  requireStaff,
} from "../middleware/auth.js";
import * as variantsController from "../controllers/variants.controller.js";

const router = Router();
router.use(requireAuth);
router.use(requireMerchant);
// (owner & manager)
router.post(
  "/items/:itemId/variants",
  requireCanEditMenu,
  asyncHandler(variantsController.create),
);
router.get(
  "/items/:itemId/variants",
  requireStaff,
  asyncHandler(variantsController.listByItem),
);
// (owner & manager)
router.patch("/variants/:variantId", requireCanEditMenu, asyncHandler(variantsController.update));
// (owner & manager)
router.delete("/variants/:variantId", requireCanEditMenu, asyncHandler(variantsController.remove));

export default router;

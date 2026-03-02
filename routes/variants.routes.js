import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import {
  requireAuth,
  requireMerchant,
  requireCanEditMenu,
} from "../middleware/auth.js";
import * as variantsController from "../controllers/variants.controller.js";

const router = Router();
router.use(requireAuth);
router.use(requireMerchant);
router.use(requireCanEditMenu);

router.post("/items/:itemId/variants", asyncHandler(variantsController.create));
router.get(
  "/items/:itemId/variants",
  asyncHandler(variantsController.listByItem),
);
router.patch("/variants/:variantId", asyncHandler(variantsController.update));
router.delete("/variants/:variantId", asyncHandler(variantsController.remove));

export default router;

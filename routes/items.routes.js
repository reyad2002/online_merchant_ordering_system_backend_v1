import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import {
  requireAuth,
  requireMerchant,
  requireCanEditMenu,
  requireStaff
} from "../middleware/auth.js";
import { uploadItemImages as uploadItemImagesMw } from "../middleware/upload.js";
import * as itemsController from "../controllers/items.controller.js";

const router = Router();
router.use(requireAuth);
router.use(requireMerchant);
// router.use(requireCanEditMenu);

router.post(
  "/categories/:categoryId/items",
  requireCanEditMenu,
  asyncHandler(itemsController.create),
);
router.get(
  "/categories/:categoryId/items",
  requireStaff,
  asyncHandler(itemsController.listByCategory),
);
router.get("/items/:itemId", requireStaff, asyncHandler(itemsController.getOne));
router.patch("/items/:itemId", requireCanEditMenu, asyncHandler(itemsController.update));
router.patch(
  "/items/:itemId/status",
  requireCanEditMenu,
  asyncHandler(itemsController.updateStatus),
);
router.post(
  "/items/:itemId/images",
  requireCanEditMenu,
  uploadItemImagesMw,
  asyncHandler(itemsController.uploadItemImages),
);
router.patch(
  "/items/:itemId/images",
  requireCanEditMenu,
  uploadItemImagesMw,
  asyncHandler(itemsController.uploadItemImages),
);
router.delete("/items/:itemId", requireCanEditMenu, asyncHandler(itemsController.remove));
router.patch(
  "/items/:itemId/images/clear",
  requireCanEditMenu,
  asyncHandler(itemsController.clearItemImage),
);

export default router;

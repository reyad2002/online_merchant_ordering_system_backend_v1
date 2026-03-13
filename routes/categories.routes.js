import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import {
  requireAuth,
  requireMerchant,
  requireCanEditMenu,
} from "../middleware/auth.js";
import * as categoriesController from "../controllers/categories.controller.js";

const router = Router();
router.use(requireAuth);
router.use(requireMerchant);

router.patch("/reorder", requireCanEditMenu, asyncHandler(categoriesController.reorder));
router.patch("/:categoryId", requireCanEditMenu, asyncHandler(categoriesController.update));
router.delete("/:categoryId", requireCanEditMenu, asyncHandler(categoriesController.remove));

export default router;

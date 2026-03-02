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
router.use(requireCanEditMenu);

router.patch("/reorder", asyncHandler(categoriesController.reorder));
router.patch("/:categoryId", asyncHandler(categoriesController.update));
router.delete("/:categoryId", asyncHandler(categoriesController.remove));

export default router;

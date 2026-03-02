import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import {
  requireAuth,
  requireMerchant,
  requireCanEditMenu,
} from "../middleware/auth.js";
import * as menusController from "../controllers/menus.controller.js";

const router = Router();
router.use(requireAuth);
router.use(requireMerchant);
router.use(requireCanEditMenu);

router.post("/", asyncHandler(menusController.create));
router.get("/", asyncHandler(menusController.list));
router.post(
  "/:menuId/categories",
  asyncHandler(menusController.createCategory),
);
router.get("/:menuId/categories", asyncHandler(menusController.listCategories));
router.patch("/:menuId", asyncHandler(menusController.update));
router.delete("/:menuId", asyncHandler(menusController.remove));

export default router;

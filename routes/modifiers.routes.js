import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import {
  requireAuth,
  requireMerchant,
  requireCanEditMenu,
  requireStaff,
} from "../middleware/auth.js";
import * as modifiersController from "../controllers/modifiers.controller.js";

const router = Router();
router.use(requireAuth);
router.use(requireMerchant);

router.post("/modifier-groups", requireCanEditMenu, asyncHandler(modifiersController.createGroup));
router.get("/modifier-groups", requireStaff, asyncHandler(modifiersController.listGroups));
router.patch(
  "/modifier-groups/:groupId",
  requireCanEditMenu,
  asyncHandler(modifiersController.updateGroup),
);
router.delete(
  "/modifier-groups/:groupId",
  requireCanEditMenu,
  asyncHandler(modifiersController.removeGroup),
);
router.post(
  "/modifier-groups/:groupId/modifiers",
  requireCanEditMenu,
  asyncHandler(modifiersController.createModifier),
);
router.get(
  "/modifier-groups/:groupId/modifiers",
  requireStaff,
  asyncHandler(modifiersController.listModifiers),
);
router.patch(
  "/modifiers/:modifierId",
  requireCanEditMenu,
  asyncHandler(modifiersController.updateModifier),
);
router.delete(
  "/modifiers/:modifierId",
  requireCanEditMenu,
  asyncHandler(modifiersController.removeModifier),
);
router.post(
  "/items/:itemId/modifier-groups",
  requireCanEditMenu,
  asyncHandler(modifiersController.attachToItem),
);
router.get(
  "/items/:itemId/modifier-groups",
  requireStaff,
  asyncHandler(modifiersController.listByItem),
);
router.patch(
  "/items/:itemId/modifier-groups/:groupId",
  requireCanEditMenu,
  asyncHandler(modifiersController.updateItemModifierGroup),
);
router.delete(
  "/items/:itemId/modifier-groups/:groupId",
  requireCanEditMenu,
  asyncHandler(modifiersController.detachFromItem),
);

export default router;

import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import {
  requireAuth,
  requireMerchant,
  requireCanEditMenu,
} from "../middleware/auth.js";
import * as modifiersController from "../controllers/modifiers.controller.js";

const router = Router();
router.use(requireAuth);
router.use(requireMerchant);
router.use(requireCanEditMenu);

router.post("/modifier-groups", asyncHandler(modifiersController.createGroup));
router.get("/modifier-groups", asyncHandler(modifiersController.listGroups));
router.patch(
  "/modifier-groups/:groupId",
  asyncHandler(modifiersController.updateGroup),
);
router.delete(
  "/modifier-groups/:groupId",
  asyncHandler(modifiersController.removeGroup),
);
router.post(
  "/modifier-groups/:groupId/modifiers",
  asyncHandler(modifiersController.createModifier),
);
router.get(
  "/modifier-groups/:groupId/modifiers",
  asyncHandler(modifiersController.listModifiers),
);
router.patch(
  "/modifiers/:modifierId",
  asyncHandler(modifiersController.updateModifier),
);
router.delete(
  "/modifiers/:modifierId",
  asyncHandler(modifiersController.removeModifier),
);
router.post(
  "/items/:itemId/modifier-groups",
  asyncHandler(modifiersController.attachToItem),
);
router.get(
  "/items/:itemId/modifier-groups",
  asyncHandler(modifiersController.listByItem),
);
router.patch(
  "/items/:itemId/modifier-groups/:groupId",
  asyncHandler(modifiersController.updateItemModifierGroup),
);
router.delete(
  "/items/:itemId/modifier-groups/:groupId",
  asyncHandler(modifiersController.detachFromItem),
);

export default router;

import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import {
  requireAuth,
  requireMerchant,
  requireManager,
} from "../middleware/auth.js";
import * as statsController from "../controllers/stats.controller.js";

const router = Router();

router.use(requireAuth);
router.use(requireMerchant);
router.use(requireManager);

router.get("/sales", asyncHandler(statsController.sales));
router.get("/branches", asyncHandler(statsController.branches));
router.get("/tables", asyncHandler(statsController.tables));
router.get("/menu", asyncHandler(statsController.menu));
router.get("/operations", asyncHandler(statsController.operations));

export default router;

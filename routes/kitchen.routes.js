import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, requireMerchant, requireStaff } from "../middleware/auth.js";
import * as kitchenController from "../controllers/kitchen.controller.js";

const router = Router();
router.use(requireAuth);
router.use(requireMerchant);
router.use(requireStaff);

router.get("/orders", asyncHandler(kitchenController.listOrders));

export default router;

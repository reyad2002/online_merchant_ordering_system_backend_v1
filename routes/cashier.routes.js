import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireAuth, requireMerchant, requireStaff } from "../middleware/auth.js";
import * as cashierController from "../controllers/cashier.controller.js";

const router = Router();
router.use(requireAuth);
router.use(requireMerchant);
router.use(requireStaff);

router.get("/orders", asyncHandler(cashierController.listOrders));

export default router;

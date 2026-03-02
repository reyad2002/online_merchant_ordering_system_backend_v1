import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import {
  requireAuth,
  requireMerchant,
  requireOwner,
} from "../middleware/auth.js";
import * as merchantsController from "../controllers/merchants.controller.js";

const router = Router();
router.use(requireAuth);
router.use(requireMerchant);
router.use(requireOwner);

router.post("/", asyncHandler(merchantsController.create));
router.get("/", asyncHandler(merchantsController.list));
router.patch("/:merchantId", asyncHandler(merchantsController.update));

export default router;

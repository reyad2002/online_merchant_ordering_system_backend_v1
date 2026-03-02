import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import {
  requireAuth,
  requireMerchant,
  requireCanEditBranches,
} from "../middleware/auth.js";
import * as branchesController from "../controllers/branches.controller.js";

const router = Router();
router.use(requireAuth);
router.use(requireMerchant);
router.use(requireCanEditBranches);

router.post("/", asyncHandler(branchesController.create));
router.get("/", asyncHandler(branchesController.list));
router.patch("/:branchId", asyncHandler(branchesController.update));
router.delete("/:branchId", asyncHandler(branchesController.remove));
router.post("/:branchId/tables", asyncHandler(branchesController.createTable));
router.get("/:branchId/tables", asyncHandler(branchesController.listTables));

export default router;

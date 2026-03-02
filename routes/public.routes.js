import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import * as publicController from "../controllers/public.controller.js";

const router = Router();

router.get("/menu", asyncHandler(publicController.getMenu));
router.post("/cart/validate", asyncHandler(publicController.validateCart));

export default router;

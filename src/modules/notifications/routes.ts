import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import * as NotificationController from "./controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", NotificationController.getMyNotifications);
router.patch("/:id/read", NotificationController.markAsRead);
router.patch("/read-all", NotificationController.markAllAsRead);

export default router;

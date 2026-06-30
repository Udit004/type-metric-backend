import { Router } from "express";
import notificationRoutes from "./notifications/routes.js";
// ... other imports

const router = Router();

router.use("/notifications", notificationRoutes);

export default router;

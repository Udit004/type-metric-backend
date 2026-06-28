import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.js";
import { create, getShared } from "./controller.js";

const typingSessionRouter = Router();

typingSessionRouter.post("/", requireAuth, create);
typingSessionRouter.get("/share/:shareId", getShared);

export default typingSessionRouter;
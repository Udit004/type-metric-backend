import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.js";
import { create } from "./controller.js";

const typingSessionRouter = Router();

typingSessionRouter.post("/", requireAuth, create);

export default typingSessionRouter;
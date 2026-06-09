import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.js";
import { googleCallback, googleStart, login, me, register } from "./controller.js";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.get("/google", googleStart);
authRouter.get("/google/callback", googleCallback);
authRouter.get("/me", requireAuth, me);

export default authRouter;

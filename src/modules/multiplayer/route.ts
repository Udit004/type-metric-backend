import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.js";
import { createRoom, getRoom, joinRoom } from "./controller.js";

const multiplayerRouter = Router();

multiplayerRouter.post("/rooms", requireAuth, createRoom);
multiplayerRouter.post("/rooms/:roomId/join", requireAuth, joinRoom);
multiplayerRouter.get("/rooms/:roomId", requireAuth, getRoom);

export default multiplayerRouter;

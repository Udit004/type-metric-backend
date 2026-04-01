import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.js";
import { createRoom, getRoom, getRoomVoiceToken, joinRoom } from "./controller.js";

const multiplayerRouter = Router();

multiplayerRouter.post("/rooms", requireAuth, createRoom);
multiplayerRouter.post("/rooms/:roomId/join", requireAuth, joinRoom);
multiplayerRouter.get("/rooms/:roomId", requireAuth, getRoom);
multiplayerRouter.get("/rooms/:roomId/voice-token", requireAuth, getRoomVoiceToken);

export default multiplayerRouter;

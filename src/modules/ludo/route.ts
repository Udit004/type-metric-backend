import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.js";
import { createRoom, joinRoom } from "./controller.js";

const ludoRouter = Router();

// POST /api/v1/ludo/rooms -> returns { roomId, hostId }
ludoRouter.post("/rooms", requireAuth, createRoom);

// POST /api/v1/ludo/rooms/:roomId/join -> returns { roomId, ok }
ludoRouter.post("/rooms/:roomId/join", requireAuth, joinRoom);

export default ludoRouter;


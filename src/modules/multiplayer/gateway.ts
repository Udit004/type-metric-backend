import { IncomingMessage, Server as HttpServer } from "http";
import jwt, { JwtPayload } from "jsonwebtoken";
import { URL } from "url";
import { WebSocket, WebSocketServer } from "ws";

import User from "../../models/User.model.js";
import { multiplayerRoomService } from "./service.js";
import { MultiplayerServerEvent, MultiplayerUser, ProgressUpdateInput } from "./types.js";

interface WsClientMessage {
  type?: string;
  payload?: unknown;
}

interface SocketContext {
  user: MultiplayerUser;
  roomId: string | null;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return secret;
}

async function authenticate(request: IncomingMessage): Promise<MultiplayerUser> {
  const host = request.headers.host;

  if (!host) {
    throw new Error("Missing host header");
  }

  const parsedUrl = new URL(request.url ?? "", `http://${host}`);
  const token = parsedUrl.searchParams.get("token");

  if (!token) {
    throw new Error("Missing token");
  }

  const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

  if (!decoded.userId || typeof decoded.userId !== "string") {
    throw new Error("Unauthorized");
  }

  const user = await User.findById(decoded.userId).select("name").lean();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return {
    userId: String(decoded.userId),
    name: user.name,
  };
}

function isOpenSocket(socket: WebSocket): boolean {
  return socket.readyState === WebSocket.OPEN;
}

function send(socket: WebSocket, message: unknown): void {
  if (!isOpenSocket(socket)) {
    return;
  }

  socket.send(JSON.stringify(message));
}

function sendError(socket: WebSocket, code: string, message: string): void {
  send(socket, {
    type: "error",
    payload: {
      code,
      message,
    },
  });
}

function parseProgress(payload: unknown): { roomId: string; progress: ProgressUpdateInput } {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload is required");
  }

  const body = payload as {
    roomId?: unknown;
    typedCharacters?: unknown;
    correctCharacters?: unknown;
    mistakes?: unknown;
    accuracy?: unknown;
    wpm?: unknown;
  };

  if (!body.roomId || typeof body.roomId !== "string") {
    throw new Error("roomId is required");
  }

  return {
    roomId: body.roomId,
    progress: {
      typedCharacters: Number(body.typedCharacters),
      correctCharacters: Number(body.correctCharacters),
      mistakes: Number(body.mistakes),
      accuracy: Number(body.accuracy),
      wpm: Number(body.wpm),
    },
  };
}

function parseRoomPayload(payload: unknown): { roomId: string } {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload is required");
  }

  const body = payload as { roomId?: unknown };

  if (!body.roomId || typeof body.roomId !== "string") {
    throw new Error("roomId is required");
  }

  return { roomId: body.roomId };
}

function parseCreatePayload(payload: unknown): { promptText?: string } {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const body = payload as { promptText?: unknown };

  if (typeof body.promptText === "string") {
    return { promptText: body.promptText };
  }

  return {};
}

function parseChatPayload(payload: unknown): { roomId: string; text: string } {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload is required");
  }

  const body = payload as { roomId?: unknown; text?: unknown };

  if (!body.roomId || typeof body.roomId !== "string") {
    throw new Error("roomId is required");
  }

  if (typeof body.text !== "string") {
    throw new Error("text is required");
  }

  return {
    roomId: body.roomId,
    text: body.text,
  };
}

function parseChatTypingPayload(payload: unknown): { roomId: string; isTyping: boolean } {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload is required");
  }

  const body = payload as { roomId?: unknown; isTyping?: unknown };

  if (!body.roomId || typeof body.roomId !== "string") {
    throw new Error("roomId is required");
  }

  if (typeof body.isTyping !== "boolean") {
    throw new Error("isTyping is required");
  }

  return {
    roomId: body.roomId,
    isTyping: body.isTyping,
  };
}

export function attachMultiplayerGateway(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
  });

  const contexts = new Map<WebSocket, SocketContext>();

  const broadcastToRoom = (roomId: string, message: unknown): void => {
    contexts.forEach((context, socket) => {
      if (context.roomId !== roomId) {
        return;
      }

      send(socket, message);
    });
  };

  const handleServiceEvent = (event: MultiplayerServerEvent): void => {
    if (event.type === "room:closed") {
      broadcastToRoom(event.roomId, {
        type: "room:closed",
        payload: {
          roomId: event.roomId,
          reason: event.reason,
        },
      });

      contexts.forEach((context) => {
        if (context.roomId === event.roomId) {
          context.roomId = null;
        }
      });

      return;
    }

    if (event.type === "room:state") {
      broadcastToRoom(event.room.roomId, {
        type: event.type,
        payload: event,
      });
      return;
    }

    if (event.type === "chat:message") {
      broadcastToRoom(event.roomId, {
        type: event.type,
        payload: event,
      });
      return;
    }

    broadcastToRoom(event.roomId, {
      type: event.type,
      payload: event,
    });
  };

  multiplayerRoomService.setEventListener(handleServiceEvent);

  wss.on("connection", async (socket: WebSocket, request: IncomingMessage) => {
    try {
      const user = await authenticate(request);

      contexts.set(socket, {
        user,
        roomId: null,
      });

      send(socket, {
        type: "connection:ready",
        payload: {
          user,
        },
      });

      socket.on("message", (rawData: Buffer) => {
        const context = contexts.get(socket);

        if (!context) {
          sendError(socket, "NOT_AUTHENTICATED", "Connection is not authenticated");
          return;
        }

        try {
          const parsed = JSON.parse(rawData.toString()) as WsClientMessage;

          if (!parsed.type || typeof parsed.type !== "string") {
            throw new Error("type is required");
          }

          switch (parsed.type) {
            case "room:create": {
              const body = parseCreatePayload(parsed.payload);
              const room = multiplayerRoomService.createRoom(context.user, body.promptText);
              context.roomId = room.roomId;

              send(socket, {
                type: "room:created",
                payload: {
                  room,
                },
              });
              break;
            }
            case "room:join": {
              const { roomId } = parseRoomPayload(parsed.payload);
              const room = multiplayerRoomService.joinRoom(roomId, context.user);
              context.roomId = roomId;

              send(socket, {
                type: "room:joined",
                payload: {
                  room,
                },
              });
              break;
            }
            case "room:leave": {
              const activeRoomId = context.roomId;

              if (!activeRoomId) {
                throw new Error("Not in a room");
              }

              multiplayerRoomService.leaveRoom(activeRoomId, context.user.userId);
              context.roomId = null;

              send(socket, {
                type: "room:left",
                payload: {
                  roomId: activeRoomId,
                },
              });
              break;
            }
            case "room:start": {
              const activeRoomId = context.roomId;

              if (!activeRoomId) {
                throw new Error("Not in a room");
              }

              const room = multiplayerRoomService.startRace(activeRoomId, context.user.userId);

              send(socket, {
                type: "room:start:accepted",
                payload: {
                  room,
                },
              });
              break;
            }
            case "room:return-lobby": {
              const activeRoomId = context.roomId;

              if (!activeRoomId) {
                throw new Error("Not in a room");
              }

              const room = multiplayerRoomService.returnToLobby(activeRoomId, context.user.userId);

              send(socket, {
                type: "room:return-lobby:accepted",
                payload: {
                  room,
                },
              });
              break;
            }
            case "race:progress": {
              const { roomId, progress } = parseProgress(parsed.payload);
              const room = multiplayerRoomService.updateProgress(
                roomId,
                context.user.userId,
                progress
              );

              context.roomId = room.roomId;
              break;
            }
            case "room:sync": {
              const { roomId } = parseRoomPayload(parsed.payload);

              if (!multiplayerRoomService.isParticipant(roomId, context.user.userId)) {
                throw new Error("You are not part of this room");
              }

              const room = multiplayerRoomService.reconnectUser(roomId, context.user.userId);
              context.roomId = room.roomId;

              send(socket, {
                type: "room:synced",
                payload: {
                  room,
                },
              });
              break;
            }
            case "chat:send": {
              const { roomId, text } = parseChatPayload(parsed.payload);

              if (!multiplayerRoomService.isParticipant(roomId, context.user.userId)) {
                throw new Error("You are not part of this room");
              }

              multiplayerRoomService.sendChatMessage(roomId, context.user, text);
              context.roomId = roomId;
              break;
            }
            case "chat:typing": {
              const { roomId, isTyping } = parseChatTypingPayload(parsed.payload);

              if (!multiplayerRoomService.isParticipant(roomId, context.user.userId)) {
                throw new Error("You are not part of this room");
              }

              multiplayerRoomService.sendChatTyping(roomId, context.user, isTyping);
              context.roomId = roomId;
              break;
            }
            default:
              throw new Error(`Unsupported event type: ${parsed.type}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Invalid WebSocket message";
          sendError(socket, "BAD_REQUEST", message);
        }
      });

      socket.on("close", () => {
        const context = contexts.get(socket);

        if (!context) {
          return;
        }

        multiplayerRoomService.markDisconnected(context.user.userId);
        contexts.delete(socket);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      sendError(socket, "UNAUTHORIZED", message);
      socket.close(1008, "Unauthorized");
    }
  });

  return wss;
}

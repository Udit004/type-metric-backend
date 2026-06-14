import { IncomingMessage, Server as HttpServer } from "http";
import { LudoRoomsStore } from "../state/rooms-store.js";
import { LudoService } from "../service/ludo.service.js";
import { LudoClientEvent, LudoServerEvent, LudoRoomState } from "./events.js";

function logLudo(msg: string, extra?: Record<string, unknown>) {
  if (extra) console.log(`[LUDO] ${msg}`, extra);
  else console.log(`[LUDO] ${msg}`);
}



export type WsClientMessage = LudoClientEvent;

function parseString(val: unknown): string | null {
  return typeof val === "string" && val.trim().length > 0 ? val : null;
}

function buildTokenState(room: LudoRoomState): Record<string, unknown> {
  return room.tokens_by_player ?? {};
}

import { sharedLudoStore, sharedLudoService } from "../service/ludo.service.js";

export function createLudoHandlers(httpServer: HttpServer) {
  const store = sharedLudoStore;
  const service = sharedLudoService;

  return {
    store,
    service,
    async handleLudoEvent(args: {
      socket: any;

      // For easier debugging from Godot/Browser, log the socket connection readiness.
      // Note: this is logged only when an event is received.
      // (If you want connection-level logs, instrument gateway/dice/ws server.)

      context: { user: { userId: string; name: string } };
      event: WsClientMessage;
      send: (msg: LudoServerEvent) => void;
      broadcastToRoom: (roomId: string, msg: LudoServerEvent) => void;
    }): Promise<void> {
      const { context, event, send, broadcastToRoom } = args;

      switch (event.type) {
        case "ludo:room:create": {
          logLudo("received ludo:room:create", {
            userId: context.user.userId,
            payloadRoomId: (event.payload as any)?.roomId,
          });

          const roomId = parseString(event.payload?.roomId) ?? `ludo-${context.user.userId}-${Date.now()}`;
          const room = service.createRoom(roomId, context.user, 2);


          send({ type: "ludo:room:created", payload: { roomId: room.roomId, hostId: room.hostId } });
          break;
        }

        case "ludo:room:join": {
          logLudo("received ludo:room:join", {
            userId: context.user.userId,
            payloadRoomId: (event.payload as any)?.roomId,
          });

          const roomId = event.payload.roomId;
          const room = service.joinRoom(roomId, context.user);

          // Broadcast joined state so all clients (host+joiners) see the same roster.
          // Ensure we always include full roster with host included.
          broadcastToRoom(roomId, {
            type: "ludo:room:joined",
            payload: {
              roomId,
              roomState: room,
            },
          });
          // Also respond to caller.
          send({ type: "ludo:room:joined", payload: { roomId, roomState: room } });
          break;
        }


        case "ludo:dice:roll": {
          const { roomId, player_color } = event.payload;
          const res = service.rollDiceForRoom(roomId, {
            userId: context.user.userId,
            name: context.user.name,
            player_color,
          });

          broadcastToRoom(roomId, {
            type: "ludo:dice:result",
            payload: {
              roomId,
              dice_value: res.dice_value,
              actorUserId: context.user.userId,
            },
          });

          broadcastToRoom(roomId, {
            type: "ludo:tokens:state",
            payload: {
              roomId,
              tokens_by_player: buildTokenState(res.room),
            },
          });

          break;
        }

        case "ludo:room:start": {
          logLudo("received ludo:room:start", {
            userId: context.user.userId,
            payloadRoomId: event.payload.roomId,
          });

          const roomId = event.payload.roomId;
          const room = service.startRoom(roomId);

          broadcastToRoom(roomId, {
            type: "ludo:room:started",
            payload: { roomId, roomState: room }
          });
          break;
        }

        case "ludo:token:move": {
          const { roomId, player_color, token_index, steps } = event.payload as any;
          logLudo("received ludo:token:move", { userId: context.user.userId, player_color, token_index, steps });
          
          broadcastToRoom(roomId, {
            type: "ludo:token:moved",
            payload: { roomId, player_color, token_index, steps }
          });
          break;
        }

        case "ludo:turn:end": {
          const { roomId } = event.payload as any;
          logLudo("received ludo:turn:end", { userId: context.user.userId });
          
          const room = service.advanceTurn(roomId);
          
          broadcastToRoom(roomId, {
            type: "ludo:turn:changed",
            payload: { roomId, current_turn: room.current_turn! }
          });
          break;
        }

        default: {
          send({
            type: "error",
            payload: { code: "BAD_REQUEST", message: `Unsupported ludo event type: ${(event as any).type}` },
          });
        }
      }
    },
  };
}


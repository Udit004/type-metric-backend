import { InternalRoom } from "../room/internal-types.js";

export function clearWaitingRoomExpiry(room: InternalRoom): void {
  if (!room.waitingRoomExpiry) {
    return;
  }

  clearTimeout(room.waitingRoomExpiry);
  room.waitingRoomExpiry = null;
}

export function clearFinishedRoomExpiry(room: InternalRoom): void {
  if (!room.finishedRoomExpiry) {
    return;
  }

  clearTimeout(room.finishedRoomExpiry);
  room.finishedRoomExpiry = null;
}

export function clearCountdownTimer(room: InternalRoom): void {
  if (!room.countdownInterval) {
    return;
  }

  clearInterval(room.countdownInterval);
  room.countdownInterval = null;
}

export function clearRaceRuntimeTimers(room: InternalRoom): void {
  if (room.raceTickInterval) {
    clearInterval(room.raceTickInterval);
    room.raceTickInterval = null;
  }

  if (room.raceTimeout) {
    clearTimeout(room.raceTimeout);
    room.raceTimeout = null;
  }
}

export function clearRaceLifecycleTimers(room: InternalRoom): void {
  clearCountdownTimer(room);
  clearRaceRuntimeTimers(room);
}

export function clearAllRoomTimers(room: InternalRoom): void {
  clearWaitingRoomExpiry(room);
  clearFinishedRoomExpiry(room);
  clearRaceLifecycleTimers(room);
}

export function startCountdownTimer(
  room: InternalRoom,
  countdownSeconds: number,
  onTick: (remainingSeconds: number) => void,
  onComplete: () => void
): void {
  clearCountdownTimer(room);

  let remainingSeconds = countdownSeconds;
  onTick(remainingSeconds);

  room.countdownInterval = setInterval(() => {
    remainingSeconds -= 1;

    if (remainingSeconds > 0) {
      onTick(remainingSeconds);
      return;
    }

    clearCountdownTimer(room);
    onComplete();
  }, 1000);
}

export function startRaceRuntimeTimers(
  room: InternalRoom,
  onTick: (remainingSeconds: number, endsAt: number) => void,
  onTimeout: () => void
): void {
  clearRaceRuntimeTimers(room);

  room.raceTickInterval = setInterval(() => {
    const endsAt = room.endsAt ?? Date.now();
    const remainingMs = Math.max(0, endsAt - Date.now());
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    onTick(remainingSeconds, endsAt);
  }, 1000);

  room.raceTimeout = setTimeout(() => {
    onTimeout();
  }, room.durationSeconds * 1000);
}

import type { JoinedRoomPlayer } from '../types/game-session'
import { gameSessionService } from './game-session-service'

type RoomIdentity = Pick<JoinedRoomPlayer, 'playerId' | 'sessionId' | 'roomCode' | 'nickname'>

function storageKey(userId: number, sessionId: number): string {
	return `kahoot:joined-room:${userId}:${sessionId}`
}

function parseRoomIdentity(value: string | null, sessionId: number): JoinedRoomPlayer | null {
	if (!value) return null

	try {
		const parsed: unknown = JSON.parse(value)
		if (typeof parsed !== 'object' || parsed === null) return null
		const candidate = parsed as Partial<JoinedRoomPlayer>
		if (
			typeof candidate.playerId !== 'number' ||
			candidate.sessionId !== sessionId ||
			typeof candidate.roomCode !== 'string' ||
			typeof candidate.nickname !== 'string'
		) {
			return null
		}
		return candidate as JoinedRoomPlayer
	} catch {
		return null
	}
}

export function saveJoinedRoomIdentity(userId: number, room: RoomIdentity): void {
	const key = storageKey(userId, room.sessionId)
	const value = JSON.stringify(room)
	sessionStorage.setItem(key, value)
	localStorage.setItem(key, value)
}

export async function restoreJoinedRoomIdentity(
	userId: number,
	sessionId: number,
	accessToken: string,
): Promise<JoinedRoomPlayer | null> {
	const key = storageKey(userId, sessionId)
	const storedRoom =
		parseRoomIdentity(sessionStorage.getItem(key), sessionId) ??
		parseRoomIdentity(localStorage.getItem(key), sessionId)
	if (storedRoom) {
		sessionStorage.setItem(key, JSON.stringify(storedRoom))
		return storedRoom
	}

	const joinedRoom = (await gameSessionService.findJoined(accessToken)).find(
		(room) => room.sessionId === sessionId,
	)
	if (!joinedRoom) return null

	const roomIdentity: JoinedRoomPlayer = {
		playerId: joinedRoom.playerId,
		sessionId: joinedRoom.sessionId,
		roomCode: joinedRoom.roomCode,
		nickname: joinedRoom.nickname,
	}
	saveJoinedRoomIdentity(userId, roomIdentity)
	return roomIdentity
}

const ALPHABET = "ABCDEFGHJKMNPQRTUVWXYZ2346789";
const rooms = new Map();
function code() { let value = ""; for (let i = 0; i < 6; i++) value += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; return rooms.has(value) ? code() : value; }
function userId() { return "user_" + Math.random().toString(36).slice(2, 10); }
function create(displayName) { const roomCode = code(), id = userId(); const room = { roomCode, hostUserId: id, members: new Map(), currentSongId: null, currentSongIndex: 0, isPlaying: false, position: 0, updatedAt: Date.now(), stateVersion: 0, currentSpeaker: null }; room.members.set(id, { userId:id, displayName: cleanName(displayName, "Host") }); rooms.set(roomCode, room); return { room, member: room.members.get(id) }; }
function cleanName(value, fallback) { const name = String(value || "").trim().replace(/[<>]/g, "").slice(0, 24); return name || fallback; }
function join(roomCode, displayName) { const room = rooms.get(String(roomCode || "").toUpperCase()); if (!room) return null; const id = userId(), member = { userId:id, displayName:cleanName(displayName, "Guest") }; room.members.set(id, member); return { room, member }; }
function leave(room, id) { room.members.delete(id); if (room.currentSpeaker === id) room.currentSpeaker = null; if (room.hostUserId === id) room.hostUserId = room.members.keys().next().value || null; if (!room.members.size) rooms.delete(room.roomCode); }
function state(room) { return { roomCode:room.roomCode, hostUserId:room.hostUserId, members:[...room.members.values()], currentSongId:room.currentSongId, currentSongIndex:room.currentSongIndex, isPlaying:room.isPlaying, position:room.position, updatedAt:room.updatedAt, stateVersion:room.stateVersion, currentSpeaker:room.currentSpeaker }; }
module.exports = { create, join, leave, state };

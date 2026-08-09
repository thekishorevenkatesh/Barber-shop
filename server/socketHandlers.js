const roomManager = require("./roomManager");
function setup(io, playlist) {
  const joins = new Map();
  const recent = new Map();
  const allowed = new Set(playlist.map((song) => song.id));
  const emitState = (room) => io.to(room.roomCode).emit("ROOM_STATE", roomManager.state(room));
  function leave(socket) { const session = joins.get(socket.id); if (!session) return; socket.leave(session.room.roomCode); roomManager.leave(session.room, session.member.userId); joins.delete(socket.id); emitState(session.room); }
  io.on("connection", (socket) => {
    const throttle = (key, ms) => { const now=Date.now(), old=recent.get(socket.id+key)||0; if(now-old<ms)return false; recent.set(socket.id+key,now);return true; };
    socket.on("CREATE_ROOM", (data={}, ack=()=>{}) => { if(!throttle("create",1000)) return ack({ok:false,error:"Please wait a moment."}); leave(socket); const session=roomManager.create(data.displayName); joins.set(socket.id,session); socket.join(session.room.roomCode); ack({ok:true,roomCode:session.room.roomCode,userId:session.member.userId,state:roomManager.state(session.room)}); emitState(session.room); });
    socket.on("JOIN_ROOM", (data={}, ack=()=>{}) => { if(!throttle("join",700)) return ack({ok:false,error:"Please wait a moment."}); if(!/^[A-Z2-9]{6}$/.test(String(data.roomCode||"").toUpperCase()))return ack({ok:false,error:"Enter a valid room code."}); leave(socket); const session=roomManager.join(data.roomCode,data.displayName); if(!session)return ack({ok:false,error:"Room not found."}); joins.set(socket.id,session);socket.join(session.room.roomCode);ack({ok:true,roomCode:session.room.roomCode,userId:session.member.userId,state:roomManager.state(session.room)});emitState(session.room); });
    socket.on("MUSIC_COMMAND", (data={}, ack=()=>{}) => { const session=joins.get(socket.id); if(!session)return ack({ok:false,error:"Join a room first."}); const room=session.room, type=data.type; if(!["MUSIC_PLAY","MUSIC_PAUSE","MUSIC_SEEK","MUSIC_NEXT","MUSIC_PREVIOUS"].includes(type))return ack({ok:false,error:"Invalid music action."}); let idx=room.currentSongIndex; if(type==="MUSIC_NEXT")idx=(idx+1)%playlist.length; if(type==="MUSIC_PREVIOUS")idx=(idx-1+playlist.length)%playlist.length; if(data.songId&&allowed.has(data.songId))idx=playlist.findIndex(song=>song.id===data.songId); room.currentSongIndex=idx;room.currentSongId=playlist[idx].id; room.position=Math.max(0,Math.min(Number(data.position)||0, 21600)); room.isPlaying=type!=="MUSIC_PAUSE";room.updatedAt=Date.now();room.stateVersion++;emitState(room);ack({ok:true}); });
    socket.on("TALK_REQUEST", (ack=()=>{}) => { const s=joins.get(socket.id);if(!s)return ack({ok:false});if(s.room.currentSpeaker&&s.room.currentSpeaker!==s.member.userId)return ack({ok:false,error:"Another member is speaking."});s.room.currentSpeaker=s.member.userId;emitState(s.room);ack({ok:true}); });
    socket.on("TALK_RELEASE",()=>{const s=joins.get(socket.id);if(s&&s.room.currentSpeaker===s.member.userId){s.room.currentSpeaker=null;emitState(s.room);}});
    socket.on("WEBRTC_SIGNAL", (data={}) => { const s=joins.get(socket.id); if(!s || !s.room.members.has(data.to)) return; const target=[...joins.entries()].find(([,v])=>v.room===s.room&&v.member.userId===data.to); if(target) io.to(target[0]).emit("WEBRTC_SIGNAL", {from:s.member.userId, signal:data.signal}); });
    socket.on("LEAVE_ROOM",()=>leave(socket));socket.on("disconnect",()=>{leave(socket);recent.delete(socket.id);});
  });
}
module.exports={setup};

(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const els = { entry:$("entry-screen"), guest:$("guest-btn"), create:$("create-room-btn"), showJoin:$("show-join-btn"), join:$("join-form"), code:$("room-code-input"), name:$("display-name-input"), error:$("entry-error"), panel:$("room-panel"), roomCode:$("room-code"), members:$("member-list"), status:$("connection-status"), leave:$("leave-room-btn"), copy:$("copy-room-code") };
  let socket, roomCode, userId, state, applying = false;
  function displayName() { return els.name.value.trim(); }
  function error(message) { els.error.textContent = message || ""; }
  function setConnection(message) { els.status.textContent = message; }
  function connect() { if (!window.io) { error("Real-time service is unavailable. Please try again later."); return null; } const endpoint = window.APP_CONFIG && window.APP_CONFIG.websocketUrl; if(!endpoint){error("Room service is not configured yet.");return null;} socket = window.io(endpoint,{ transports:["websocket","polling"] }); socket.on("connect",()=>{ setConnection("● Connected"); if(roomCode && userId) socket.emit("JOIN_ROOM",{roomCode,displayName:displayName()},result=>{if(result&&result.ok){userId=result.userId;receiveState(result.state);}else error("Could not rejoin the room.");}); }); socket.on("disconnect",()=>setConnection("⚠ Reconnecting…")); socket.on("ROOM_STATE", receiveState); socket.on("WEBRTC_SIGNAL", (message) => window.walkieTalkie && window.walkieTalkie.signal(message)); return socket; }
  function enter(method, payload) { error(""); const s=connect(); if(!s)return; s.emit(method,payload,(result)=>{ if(!result || !result.ok){ error(result && result.error || "Unable to join the room.");s.disconnect();return; } roomCode=result.roomCode;userId=result.userId;els.entry.classList.add("hidden");els.panel.classList.remove("hidden");els.roomCode.textContent=roomCode;receiveState(result.state); }); }
  function receiveState(next) { state=next; renderMembers(); if(next.currentSongId && window.musicPlayer){ applying=true;window.musicPlayer.applyRoomState(next);setTimeout(()=>applying=false,1200); } }
  function renderMembers() { els.members.replaceChildren(...state.members.map(member=>{const li=document.createElement("li");li.textContent=member.displayName+(member.userId===state.hostUserId?" — Host":"")+(member.userId===state.currentSpeaker?" — Speaking":"");if(member.userId===state.currentSpeaker)li.className="speaking";return li;})); if(window.walkieTalkie)window.walkieTalkie.floor(state.currentSpeaker, state.currentSpeaker===userId); }
  els.guest.addEventListener("click",()=>els.entry.classList.add("hidden"));
  els.create.addEventListener("click",()=>enter("CREATE_ROOM",{displayName:displayName()}));
  els.showJoin.addEventListener("click",()=>els.join.classList.remove("hidden"));
  els.join.addEventListener("submit",(event)=>{event.preventDefault();enter("JOIN_ROOM",{roomCode:els.code.value.toUpperCase(),displayName:displayName()});});
  els.leave.addEventListener("click",()=>{ if(window.walkieTalkie)window.walkieTalkie.stop();if(socket){socket.emit("LEAVE_ROOM");socket.disconnect();}socket=null;roomCode=null;state=null;els.panel.classList.add("hidden");els.entry.classList.remove("hidden"); });
  els.copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(roomCode);els.copy.textContent="Copied";setTimeout(()=>els.copy.textContent="Copy",1000);}catch(_){error("Copy the room code manually.");}});
  function command(type, position) {
    if (!socket || !socket.connected) {
      document.getElementById("player-status").textContent = "Room connection lost — reconnecting…";
      return;
    }
    socket.timeout(8000).emit("MUSIC_COMMAND", { type, position }, (requestError, result) => {
      if (requestError || !result || !result.ok) {
        document.getElementById("player-status").textContent = result && result.error ? result.error : "Room server did not confirm the music action.";
      }
    });
  }
  window.roomClient = { isActive:()=>Boolean(socket&&roomCode), isApplying:()=>applying, userId:()=>userId, members:()=>state ? state.members : [], command, talk:(event,ack)=>socket&&socket.emit(event,ack), signal:(to,signal)=>socket&&socket.emit("WEBRTC_SIGNAL",{to,signal}) };
})();

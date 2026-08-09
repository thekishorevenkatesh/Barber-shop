const path = require("path");
const crypto = require("crypto");
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const clientRoot = path.join(__dirname, "..", "client");
const playlist = require("fs").readFileSync(path.join(clientRoot, "data/playlist.js"), "utf8").match(/id: "([\w-]+)"/g).map((item) => ({ id: item.match(/"([\w-]+)"/)[1] }));
const app = express();
app.use((request, response, next) => { if (process.env.FRONTEND_ORIGIN && request.headers.origin === process.env.FRONTEND_ORIGIN) response.set("Access-Control-Allow-Origin", process.env.FRONTEND_ORIGIN); next(); });
app.use(express.static(clientRoot, { index: "index.html" }));
app.get("/api/ice-servers", (_request, response) => {
  const servers = [{ urls: process.env.STUN_SERVER || "stun:stun.l.google.com:19302" }];
  const turnServer = process.env.TURN_SERVER;
  const sharedSecret = process.env.TURN_SHARED_SECRET;
  if (turnServer && sharedSecret) {
    const username = `${Math.floor(Date.now() / 1000) + 3600}:room-user`;
    const credential = crypto.createHmac("sha1", sharedSecret).update(username).digest("base64");
    servers.push({ urls: turnServer.split(",").map((url) => url.trim()).filter(Boolean), username, credential });
  }
  response.set("Cache-Control", "no-store").json({ iceServers: servers });
});
const httpServer = createServer(app); const io = new Server(httpServer, { cors: { origin: process.env.FRONTEND_ORIGIN || true } });
require("./socketHandlers").setup(io, playlist);
httpServer.listen(process.env.PORT || 4173, () => console.log("Cutting Shop room server ready"));

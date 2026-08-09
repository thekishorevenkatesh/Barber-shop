# ಕ್ಷೌರದ ಅಂಗಡಿ — shared rooms

The vanilla HTML/CSS/JS music player remains the guest experience. Selecting **Create a Room** or **Join a Room** opens a Socket.IO connection to the Node server; guests create neither a socket room nor a WebRTC connection.

## Architecture

```
YouTube-authorized catalog -> every browser's YouTube IFrame player
Socket.IO -> room membership, authoritative play/pause/seek/track state, signaling
WebRTC -> microphone tracks only, peer-to-peer push-to-talk voice
```

No music audio is uploaded, proxied, recorded, mixed, or sent by this server or WebRTC. The catalog continues to use the existing authorized YouTube embeds; replace the catalog only with music you are authorized to distribute.

## Run and deploy

## Project structure

`client/` contains the Vercel-deployed HTML, CSS, JavaScript, catalog, and PWA assets. `server/` contains the Node.js + Socket.IO room service. Deploy `client/` to Vercel with its **Root Directory** set to `client`; deploy `server/` to a persistent Node host with its **Root Directory** set to `server`.

Run the room server locally with `cd server`, `npm install`, then `npm start`. It serves the client locally for development. Production requires HTTPS/WSS for microphone/WebRTC.

When the frontend stays on Vercel, deploy this Node service separately and set its public HTTPS URL in `js/config.js` as `websocketUrl`. Add that Vercel domain to the backend CORS allow-list before production; the default server is suitable only when the frontend and backend use the same origin.

## Optional self-hosted Coturn

The default configuration is STUN-only and needs no Coturn server, domain, or TURN credentials. It is free, but some restrictive networks may prevent peer-to-peer voice from connecting. Add Coturn only if you later need that fallback.

The repository includes `server/docker-compose.coturn.yml` for a separate Linux server with a public static IPv4 address. Set the same long random `TURN_SHARED_SECRET` in that host's environment and in the Node app environment, then run `docker compose -f docker-compose.coturn.yml up -d`. Set `TURN_EXTERNAL_IP` to that server's public IPv4 and `TURN_REALM` to its DNS name. Point the app's `TURN_SERVER` at that DNS name.

Open TCP/UDP `3478` plus UDP `49160-49200` in the Coturn host firewall and cloud security group; point a DNS record such as `turn.example.com` at it. The backend issues a fresh one-hour HMAC credential from `/api/ice-servers`; the browser receives only that temporary credential, never `TURN_SHARED_SECRET`. Add TLS/TCP 5349 if your deployment needs TURN over TLS. Coturn is free software, but the server and relayed bandwidth are your hosting costs.

Rooms are held in memory, deleted when empty, and assign the first remaining member as host. Run a shared persistent room store/adapter when deploying multiple Node instances. Test with several browser profiles: create/join, playback controls and late join, disconnect/host transfer, one simultaneous talk request, and touch pointer hold/release. Browser autoplay rules can require an initial user interaction before remote audio plays.

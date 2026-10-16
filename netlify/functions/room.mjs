import { getStore } from "@netlify/blobs";
// Sala = misma WiFi (misma IP pública) o código manual. Estado en Netlify Blobs.
export default async (req, ctx) => {
  const b = await req.json();
  let ip = ctx.ip || "x";
  if (ip.includes(":")) ip = ip.split(":").slice(0, 4).join(":"); // IPv6: prefijo de la red
  const key = "r_" + (b.code ? "c_" + b.code : ip).replace(/[^\w]/g, "_").slice(0, 60);
  const store = getStore("rooms");
  const r = (await store.get(key, { type: "json" })) || { players: {}, phase: "lobby", t0: 0, winner: null };
  const now = Date.now(), P = r.players;
  for (const i in P) if (now - P[i].seen > 20000) delete P[i];
  if (b.leave) delete P[b.id];
  else {
    const p = P[b.id] || (P[b.id] = { joined: now, hidden: [], found: [], stage: "lobby" });
    Object.assign(p, b.me || {}); p.seen = now;
    const all = (o) => { for (const i in P) Object.assign(P[i], o); };
    if (b.start) { r.phase = "play"; r.t0 = 0; r.winner = null; all({ hidden: [], found: [], stage: "map", done: 0 }); }
    if (b.reset) { r.phase = "lobby"; r.t0 = 0; r.winner = null; all({ hidden: [], found: [], stage: "lobby", done: 0 }); }
    if (r.phase === "play" && !r.t0 && Object.values(P).every((q) => q.stage === "ready")) r.t0 = now;
    if (b.me && b.me.done && !r.winner) r.winner = b.id;
  }
  await store.setJSON(key, r);
  return Response.json({ ...r, now });
};
export const config = { path: "/api/room" };

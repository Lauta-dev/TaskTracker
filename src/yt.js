/* Servicio YouTube: extrae título y duración de un video desde el front.
   Sin key usa oEmbed (solo título); con VITE_YT_API_KEY usa Data API v3
   (título + duración ISO8601). Sin API key propia no hay forma pública de
   leer la duración (oEmbed no la expone y el watch HTML lo bloquea CORS). */

const YT_API_KEY = import.meta.env?.VITE_YT_API_KEY || "";

/* watch?v= · youtu.be/ · /shorts/ · /embed/ · /live/ · /v/ */
export function parseYouTubeId(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  let m = s.match(/(?:youtube\.com\/(?:watch\?[^#]*v=|shorts\/|embed\/|live\/|v\/)|youtu\.be\/)([\w-]{6,})/i);
  if (m) return m[1];
  try {
    const u = new URL(s.includes("://") ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split(/[?/]/)[0];
      return /^[\w-]{6,}$/.test(id) ? id : "";
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = u.searchParams.get("v");
      if (/^[\w-]{6,}$/.test(v || "")) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const i = parts.findIndex((p) => ["shorts", "embed", "live", "v"].includes(p));
      const id = i >= 0 ? parts[i + 1] : "";
      return /^[\w-]{6,}$/.test(id || "") ? id : "";
    }
  } catch { /* no es URL parseable */ }
  return "";
}

export const canonicalUrl = (id) => `https://www.youtube.com/watch?v=${id}`;

/* PT1H2M3S → segundos. */
export function isoDurationToSeconds(iso) {
  const m = String(iso || "").match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

/* Redondeo a minutos: el resto > 30s sube, si no baja (14:50→15, 14:30→14). */
export function roundMinutes(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  return Math.floor(s / 60) + (s % 60 > 30 ? 1 : 0);
}

/* oEmbed de YouTube no manda headers CORS: se usa noembed (con CORS). */
async function fetchTitleOnly(input) {
  const r = await fetch(
    `https://noembed.com/embed?url=${encodeURIComponent(input)}`,
  );
  if (!r.ok) throw new Error("noembed");
  const j = await r.json();
  return String(j?.title || "").trim() || null;
}

async function fetchFull(id, signal) {
  const r = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${encodeURIComponent(id)}&key=${encodeURIComponent(YT_API_KEY)}`,
    { signal },
  );
  if (!r.ok) throw new Error("yt-api");
  const item = (await r.json())?.items?.[0];
  const title = String(item?.snippet?.title || "").trim() || null;
  const secs = isoDurationToSeconds(item?.contentDetails?.duration);
  return { title, minutes: secs == null ? null : roundMinutes(secs) };
}

/* { id, url, title|null, minutes|null }. minutes solo con API key. */
export async function fetchVideoInfo(input, { signal } = {}) {
  const id = parseYouTubeId(input);
  if (!id) return null;
  if (YT_API_KEY) {
    try {
      const { title, minutes } = await fetchFull(id, signal);
      return { id, url: canonicalUrl(id), title, minutes };
    } catch { /* cae a oEmbed por el título */ }
  }
  try {
    return { id, url: canonicalUrl(id), title: await fetchTitleOnly(input), minutes: null };
  } catch {
    return { id, url: canonicalUrl(id), title: null, minutes: null };
  }
}

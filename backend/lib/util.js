class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; this.expose = true; } // expose: message is safe to show visitors
}

function rateLimit({ windowMs, max, keyFn, message = 'Too many attempts. Please wait and try again.' }) {
  const hits = new Map();
  setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset < now) hits.delete(k); }, windowMs).unref();
  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : req.ip;
    const now = Date.now();
    let e = hits.get(key);
    if (!e || e.reset < now) { e = { count: 0, reset: now + windowMs }; hits.set(key, e); }
    if (++e.count > max) {
      res.set('Retry-After', String(Math.ceil((e.reset - now) / 1000)));
      return res.status(429).json({ success: false, message });
    }
    next();
  };
}

/** Accepts only a plain https:// web address (no spaces, no credentials). Returns the cleaned URL or null. */
function cleanHttpsUrl(v) {
  const s = String(v ?? '').trim();
  if (!s || s.length > 600) return null;
  let u; try { u = new URL(s); } catch { return null; }
  if (u.protocol !== 'https:' || !u.hostname.includes('.') || u.username || u.password) return null;
  return u.toString();
}

module.exports = { HttpError, rateLimit, cleanHttpsUrl };

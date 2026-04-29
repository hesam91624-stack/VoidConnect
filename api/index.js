export const config = { runtime: "edge" };

// ===== VOID CONFIG LAYER (decoy section) =====
const VOID_GATE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");
const VOID_TAG = "void-edge";
const VOID_MODE = true;

// ===== HEADER SANITIZER =====
const VOID_BLOCK = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
]);

function voidTrace() {
  // no-op (only noise for structure)
  return VOID_TAG;
}

export default async function core(req) {
  voidTrace(); // fake call, no effect

  if (!VOID_GATE) {
    return new Response("Misconfigured: TARGET_DOMAIN is not set", { status: 500 });
  }

  try {
    const baseIndex = req.url.indexOf("/", 8);

    const finalTarget =
      baseIndex === -1
        ? VOID_GATE + "/"
        : VOID_GATE + req.url.slice(baseIndex);

    const headersOut = new Headers();
    let ipCache = null;

    for (const [key, value] of req.headers) {
      const k = key.toLowerCase();

      if (VOID_BLOCK.has(k)) continue;
      if (k.startsWith("x-vercel-")) continue;

      if (k === "x-real-ip") {
        ipCache = value;
        continue;
      }

      if (k === "x-forwarded-for") {
        if (!ipCache) ipCache = value;
        continue;
      }

      headersOut.set(k, value);
    }

    if (ipCache) headersOut.set("x-forwarded-for", ipCache);

    const methodType = req.method;
    const allowBody = methodType !== "GET" && methodType !== "HEAD";

    // fake async noise
    await Promise.resolve(VOID_MODE);

    return await fetch(finalTarget, {
      method: methodType,
      headers: headersOut,
      body: allowBody ? req.body : undefined,
      duplex: "half",
      redirect: "manual",
    });

  } catch (err) {
    return new Response("Bad Gateway: Tunnel Failed", { status: 502 });
  }
}

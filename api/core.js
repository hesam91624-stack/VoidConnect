export const config = { runtime: "edge" };

const UPSTREAM = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");

const BLOCKED = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

export default async function gateway(req) {

  const url = new URL(req.url);

  // صفحه اصلی
  if (url.pathname === "/") {
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Void</title>
        <style>
        body{
          background:#0b0b0b;
          color:#00ff9c;
          font-family:monospace;
          display:flex;
          justify-content:center;
          align-items:center;
          height:100vh;
          font-size:28px;
        }
        </style>
      </head>
      <body>void connected</body>
      </html>`,
      { headers: { "content-type": "text/html" } }
    );
  }

  if (!UPSTREAM) {
    return new Response("Upstream not configured", { status: 500 });
  }

  try {

    const target = UPSTREAM + url.pathname + url.search;

    const headers = new Headers();

    for (const [k, v] of req.headers) {
      const key = k.toLowerCase();
      if (BLOCKED.has(key)) continue;
      if (key.startsWith("x-vercel-")) continue;
      headers.set(k, v);
    }

    const method = req.method;
    const bodyAllowed = method !== "GET" && method !== "HEAD";

    const res = await fetch(target, {
      method,
      headers,
      body: bodyAllowed ? req.body : undefined,
      redirect: "manual",
      duplex: "half"
    });

    return res;

  } catch (e) {
    return new Response("gateway error", { status: 502 });
  }
}

// Middleware — JWT auth for admin routes
interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ADMIN_EMAIL: string;
}

const PUBLIC_PATHS = new Set([
  '/', '/index.html', '/admin.html', '/admin',
  '/qr.html', '/qr', '/mia.vcf',
  '/robots.txt', '/sitemap.xml', '/llms.txt', '/404.html',
  '/api/auth/login', '/api/inquiries', '/api/content',
]);

function isPublic(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) return true;
  if (/\.(css|js|ico|png|jpg|jpeg|gif|svg|woff2?|ttf|json)$/i.test(path)) return true;
  return false;
}

async function verifyJWT(token: string, secret: string): Promise<Record<string, any> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sig = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(parts[0] + '.' + parts[1]));
    if (!valid) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

export const onRequest: PagesFunction<Env>[] = [
  async (context) => {
    const { request, env, next } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // Allow public paths and POST to /api/inquiries (contact form)
    if (isPublic(path) && !(path.startsWith('/api/admin') || path.startsWith('/api/auth/me'))) {
      return next();
    }

    // Extract JWT from cookie
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/mk_token=([^;\s]+)/);
    let user: Record<string, any> | null = null;
    if (match) {
      const payload = await verifyJWT(match[1], env.JWT_SECRET);
      if (payload?.email) {
        const row = await env.DB.prepare('SELECT id, email, must_change_password FROM users WHERE email = ?').bind(payload.email).first();
        if (row) user = row as Record<string, any>;
      }
    }

    (context as any).data = { user };

    // Protected API routes need auth
    if (path.startsWith('/api/admin') || path === '/api/auth/me' || path === '/api/auth/change-password') {
      if (!user) {
        return Response.json({ error: 'Login required' }, { status: 401 });
      }
    }

    return next();
  }
];

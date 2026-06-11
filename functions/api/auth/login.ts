// POST /api/auth/login — authenticate admin user
interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ADMIN_EMAIL: string;
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function signJWT(payload: Record<string, any>, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
  const body = btoa(JSON.stringify(payload)).replace(/=/g, '');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(header + '.' + body));
  const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${header}.${body}.${sigStr}`;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return Response.json({ error: 'Email and password required' }, { status: 400 });
  }

  // Only allow the admin email
  if (email.toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const hash = await hashPassword(password);
  const user = await env.DB.prepare('SELECT id, email, must_change_password FROM users WHERE email = ? AND password_hash = ?')
    .bind(email.toLowerCase(), hash).first();

  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Update last login
  await env.DB.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?').bind(user.id).run();

  // Sign JWT (24h expiry)
  const token = await signJWT({ email: user.email, exp: Math.floor(Date.now() / 1000) + 86400 }, env.JWT_SECRET);

  return new Response(JSON.stringify({ ok: true, must_change_password: !!user.must_change_password }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `mk_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`,
    },
  });
};

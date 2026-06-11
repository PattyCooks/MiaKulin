// POST /api/auth/change-password
interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const user = (context as any).data?.user;
  if (!user) return Response.json({ error: 'Login required' }, { status: 401 });

  let body: { current_password?: string; new_password?: string };
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { current_password, new_password } = body;
  if (!new_password || new_password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  // If must_change_password, we don't require current_password verification
  if (!user.must_change_password) {
    if (!current_password) return Response.json({ error: 'Current password required' }, { status: 400 });
    const hash = await hashPassword(current_password);
    const valid = await context.env.DB.prepare('SELECT id FROM users WHERE id = ? AND password_hash = ?')
      .bind(user.id, hash).first();
    if (!valid) return Response.json({ error: 'Current password incorrect' }, { status: 401 });
  }

  const newHash = await hashPassword(new_password);
  await context.env.DB.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?')
    .bind(newHash, user.id).run();

  return Response.json({ ok: true });
};

// GET /api/admin/inquiries — list inquiries (admin only)
// PATCH /api/admin/inquiries — mark as read
interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = (context as any).data?.user;
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(context.request.url);
  const status = url.searchParams.get('status'); // 'new', 'read', or null for all
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

  let query = 'SELECT * FROM inquiries';
  const params: any[] = [];
  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const stmt = env_bind(context.env.DB.prepare(query), params);
  const { results } = await stmt.all();

  return Response.json({ inquiries: results });
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const user = (context as any).data?.user;
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { id?: number; status?: string };
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!body.id) return Response.json({ error: 'ID required' }, { status: 400 });

  const newStatus = body.status || 'read';
  await context.env.DB.prepare('UPDATE inquiries SET status = ?, read_at = datetime(\'now\') WHERE id = ?')
    .bind(newStatus, body.id).run();

  return Response.json({ ok: true });
};

// Helper to bind array of params
function env_bind(stmt: D1PreparedStatement, params: any[]): D1PreparedStatement {
  return params.length ? stmt.bind(...params) : stmt;
}

// PUT /api/admin/content — update site content (protected)
// POST /api/admin/content/reset — reset to defaults (protected)
interface Env {
  DB: D1Database;
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let data: any;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  await env.DB.prepare('UPDATE content SET data = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(JSON.stringify(data), 'site').run();

  return Response.json({ ok: true });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Check if this is a reset request
  const url = new URL(request.url);
  if (url.pathname.endsWith('/reset')) {
    const defaults = await env.DB.prepare('SELECT data FROM content_defaults WHERE id = ?').bind('site').first();
    if (defaults) {
      await env.DB.prepare('UPDATE content SET data = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .bind(defaults.data, 'site').run();
    }
    return Response.json({ ok: true, message: 'Site reset to defaults' });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
};

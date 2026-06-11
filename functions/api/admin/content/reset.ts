// POST /api/admin/content/reset — reset site to default state
interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const defaults = await env.DB.prepare('SELECT data FROM content_defaults WHERE id = ?').bind('site').first();
  if (defaults) {
    await env.DB.prepare('UPDATE content SET data = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(defaults.data, 'site').run();
  }
  return Response.json({ ok: true, message: 'Site reset to defaults' });
};

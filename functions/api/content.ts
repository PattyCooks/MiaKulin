// GET /api/content — public, returns site content for rendering
interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const row = await env.DB.prepare('SELECT data FROM content WHERE id = ?').bind('site').first();
  if (!row) {
    return Response.json({}, { status: 404 });
  }
  return new Response(row.data as string, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
  });
};

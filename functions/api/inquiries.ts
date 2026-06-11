// POST /api/inquiries — public contact form submission
// GET /api/admin/inquiries — admin only, list all inquiries
interface Env {
  DB: D1Database;
  ADMIN_EMAIL: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let body: { name?: string; email?: string; type?: string; date?: string; message?: string };
  try {
    const formData = await request.formData();
    body = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      type: formData.get('type') as string,
      date: formData.get('date') as string,
      message: formData.get('message') as string,
    };
  } catch {
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }
  }

  const { name, email, type, date, message } = body;
  if (!name || !email || !type || !message) {
    return Response.json({ error: 'Name, email, type, and message are required' }, { status: 400 });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Invalid email' }, { status: 400 });
  }

  // Store in D1
  await env.DB.prepare(
    'INSERT INTO inquiries (name, email, type, event_date, message) VALUES (?, ?, ?, ?, ?)'
  ).bind(name, email, type, date || null, message).run();

  // Redirect back to site (for form POST) or return JSON
  const accept = request.headers.get('Accept') || '';
  if (accept.includes('text/html')) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/#contact?success=1' },
    });
  }

  return Response.json({ ok: true, message: 'Inquiry received! Mia will be in touch.' });
};

// POST /api/inquiries — public contact form submission
interface Env {
  DB: D1Database;
  ADMIN_EMAIL: string;
  RESEND_API_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let body: { name?: string; email?: string; type?: string; date?: string; message?: string };
  const contentType = request.headers.get('Content-Type') || '';

  if (contentType.includes('application/json')) {
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }
  } else {
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

  // Send email notification to Mia
  if (env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Mia Kulin Site <bookings@miakulin.com>',
          reply_to: env.ADMIN_EMAIL,
          to: [env.ADMIN_EMAIL],
          subject: `New ${type} inquiry from ${name}`,
          html: `
            <h2>New Booking Inquiry</h2>
            <p><strong>From:</strong> ${name} (${email})</p>
            <p><strong>Type:</strong> ${type}</p>
            ${date ? `<p><strong>Event Date:</strong> ${date}</p>` : ''}
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p><a href="https://miakulin.pages.dev/admin.html">View in Admin Panel</a></p>
          `,
        }),
      });
    } catch {
      // Don't block the submission if email fails
    }
  }

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

// POST /api/admin/ai — AI assistant for content editing
interface Env {
  DB: D1Database;
  AI: any; // Cloudflare Workers AI binding
}

const SYSTEM_PROMPT = `You are the content editor for Mia Kulin's personal music website. Mia is a vocalist, bassist, and performer from Oakville, Ontario.

CONTEXT:
- She fronts "Whitenoise" (rock trio) and "After Dark Band" (Toronto live venues)
- Genres: rock, soul, alternative
- Based in Oakville ON, studies at York University
- Website purpose: attract bookings for live events, weddings, corporate gigs, studio sessions
- Tone: confident, down-to-earth, not corporate. She's a young performer who's serious about her craft.

YOUR ROLE:
- Help edit website copy: bio text, section headings, service descriptions
- Suggest improvements to make text more engaging
- Keep it concise — this is a personal site, not a corporate brochure
- Write in first person when appropriate (for "live" section, etc.) or third person for bio
- Never use filler words, clichés like "passionate" or "journey", or AI-sounding phrases
- Match her vibe: authentic, punchy, no-BS

When asked to edit content, return ONLY the updated text. No explanations unless asked.`;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let body: { prompt: string; section?: string; current_content?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!body.prompt) {
    return Response.json({ error: 'Prompt required' }, { status: 400 });
  }

  let userMessage = body.prompt;
  if (body.section && body.current_content) {
    userMessage = `Section: ${body.section}\nCurrent content: ${body.current_content}\n\nRequest: ${body.prompt}`;
  }

  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return Response.json({ ok: true, result: response.response });
  } catch (err: any) {
    return Response.json({ error: 'AI request failed: ' + (err.message || 'unknown') }, { status: 500 });
  }
};

// POST /api/admin/ai — AI assistant that can apply changes to any site content.
// Returns a structured JSON patch the admin UI deep-merges into the working content.
interface Env {
  DB: D1Database;
  AI: any; // Cloudflare Workers AI binding
}

const SYSTEM_PROMPT = `You are the AI editor for Mia Kulin's personal music website admin panel. You have FULL access to modify ANY site content — text, theme/colors, lists, links, services, videos, SEO — anything in the schema below.

CONTEXT:
- Mia is a vocalist/bassist from Oakville, Ontario. Fronts "Whitenoise" (rock trio) and "After Dark Band".
- Genres: rock, soul, alternative. Tone: confident, authentic, punchy, no clichés or AI-sounding phrases ("passionate", "journey", "embark", etc.).
- The site exists to attract live bookings, weddings, corporate gigs, studio sessions.

YOU WILL RECEIVE:
- The user's request (e.g. "make the theme warmer", "rewrite the bio shorter", "add a wedding package service").
- The CURRENT site content as JSON.

YOU MUST RESPOND WITH ONLY A SINGLE JSON OBJECT — no prose, no markdown fences, no commentary outside it:
{
  "changes": { ...partial content object, same shape as schema, ONLY include fields you are changing... },
  "summary": "1-2 sentence plain-English description of what you changed"
}

CONTENT SCHEMA (top-level keys you may edit):
- hero:    { title, subtitle, cta_text, cta_link }
- about:   { heading, paragraphs: string[], image, socials: [{label, url}] }
- music:   { heading, bands: [{name, description, link, link_text}], setlist_heading, setlist: string[] }
- live:    { heading, text, links: [{icon, label, url}], videos: string[] (YouTube video IDs) }
- booking: { heading, subtitle, services: string[], cta_text, cta_link }
- contact: { heading, subtitle }
- theme:   { accent, bg, surface, text, muted } — every value MUST be a 7-character hex color like "#aabbcc"
- meta:    { title, description }

RULES:
- Return ONLY the JSON object. No markdown, no \`\`\` fences, no leading/trailing text.
- For arrays (paragraphs, setlist, services, bands, socials, links, videos), provide the COMPLETE new array — not a diff.
- Only include top-level keys you are actually changing. Do NOT echo unchanged sections.
- Do NOT invent new top-level keys or fields outside the schema.
- Hex colors: 7 chars, leading "#", lowercase hex. Pick palettes with sufficient contrast (dark bg + light text, or vice versa).
- Keep copy tight. Paragraphs may use minimal inline HTML (<strong>, <em>, <a>) where appropriate.
- If the user asks something you cannot do (e.g. upload a file), put a brief note in "summary" and return "changes": {}.`;

const ALLOWED_KEYS = new Set([
  'hero', 'about', 'music', 'live', 'booking', 'contact', 'theme', 'meta',
]);
const ALLOWED_THEME_KEYS = new Set(['accent', 'bg', 'surface', 'text', 'muted']);
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isUrlFieldKey(key: string): boolean {
  const k = key.toLowerCase();
  return k === 'url' || k === 'link' || k.endsWith('_link');
}

function hasDangerousProtocol(value: string): boolean {
  return /^\s*(?:javascript|data)\s*:/i.test(value);
}

function sanitizeString(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*(?:javascript|data)\s*:[\s\S]*?\2/gi, '');
}

function sanitizeNested(value: any, keyHint?: string): any {
  if (typeof value === 'string') {
    const cleaned = sanitizeString(value);
    if (keyHint && isUrlFieldKey(keyHint) && hasDangerousProtocol(cleaned)) return undefined;
    return cleaned;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeNested(item, keyHint))
      .filter((item) => item !== undefined);
  }
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, any> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (UNSAFE_KEYS.has(key)) continue;
    const cleaned = sanitizeNested(nested, key);
    if (cleaned !== undefined) out[key] = cleaned;
  }
  return out;
}

function extractJson(raw: string): any | null {
  if (!raw) return null;
  const candidates: string[] = [];
  const trimmed = raw.trim();
  candidates.push(trimmed);
  // Strip ```json ... ``` fences
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) candidates.push(fence[1].trim());
  // Fallback: grab outermost {...}
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) candidates.push(trimmed.slice(first, last + 1));
  for (const c of candidates) {
    try { return JSON.parse(c); } catch { /* try next */ }
  }
  return null;
}

function sanitizeChanges(changes: any): Record<string, any> {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return {};
  const out: Record<string, any> = {};
  for (const k of Object.keys(changes)) {
    if (ALLOWED_KEYS.has(k)) out[k] = sanitizeNested(changes[k], k);
  }
  // Normalize theme hex colors
  if (out.theme && typeof out.theme === 'object' && !Array.isArray(out.theme)) {
    const t: Record<string, any> = {};
    for (const [key, val] of Object.entries(out.theme)) {
      if (!ALLOWED_THEME_KEYS.has(key)) continue;
      if (typeof val === 'string' && /^#[0-9a-fA-F]{6}$/.test(val.trim())) {
        t[key] = val.trim().toLowerCase();
      } else if (typeof val === 'string' && /^#[0-9a-fA-F]{3}$/.test(val.trim())) {
        // expand #abc -> #aabbcc
        const s = val.trim().slice(1);
        t[key] = ('#' + s.split('').map(c => c + c).join('')).toLowerCase();
      }
    }
    if (Object.keys(t).length) out.theme = t;
    else delete out.theme;
  } else if ('theme' in out) {
    delete out.theme;
  }
  return out;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let body: { prompt?: string; content?: any; section?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const prompt = (body.prompt || '').trim();
  if (!prompt) {
    return Response.json({ error: 'Prompt required' }, { status: 400 });
  }

  // Use client-supplied content if present (reflects unsaved edits), otherwise load live content
  let current: any = body.content;
  if (!current || typeof current !== 'object') {
    const row = await env.DB.prepare('SELECT data FROM content WHERE id = ?').bind('site').first();
    try { current = row?.data ? JSON.parse(row.data as string) : {}; } catch { current = {}; }
  }

  const focused = body.section ? `\n\nThe user is currently viewing the "${body.section}" section.` : '';
  const userMessage =
    `User request: ${prompt}${focused}\n\n` +
    `Current site content (JSON):\n${JSON.stringify(current)}`;

  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 2048,
      temperature: 0.4,
      response_format: { type: 'json_object' },
    });

    const raw: string = (response?.response ?? '').toString();
    const parsed = extractJson(raw);
    if (!parsed || typeof parsed !== 'object') {
      return Response.json(
        { error: 'AI returned unparseable output. Try rephrasing the request.', raw },
        { status: 502 },
      );
    }

    const changes = sanitizeChanges(parsed.changes);
    const summary = typeof parsed.summary === 'string' ? parsed.summary : '';

    return Response.json({ ok: true, changes, summary });
  } catch (err: any) {
    return Response.json(
      { error: 'AI request failed: ' + (err?.message || 'unknown') },
      { status: 500 },
    );
  }
};

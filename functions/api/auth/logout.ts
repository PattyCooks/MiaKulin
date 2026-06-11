// POST /api/auth/logout
export const onRequestPost: PagesFunction = async () => {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'mk_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
    },
  });
};

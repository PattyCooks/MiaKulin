// GET /api/auth/me — return current user info
interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = (context as any).data?.user;
  if (!user) return Response.json({ error: 'Not logged in' }, { status: 401 });
  return Response.json({ email: user.email, must_change_password: !!user.must_change_password });
};

-- Seed: Insert admin user with temp password "MiaKulin2026!"
-- SHA-256 of "MiaKulin2026!" = generated at deploy time
-- Run: npx wrangler d1 execute miakulin-db --file=migrations/0002_seed_admin.sql

INSERT OR IGNORE INTO users (email, password_hash, must_change_password)
VALUES (
  'mia.kulinchenko@gmail.com',
  '5c5dc9bd7e0eca7ca414d2bf58e2984ba8f51d4f2b2d94baf1061dd922842859',
  1
);

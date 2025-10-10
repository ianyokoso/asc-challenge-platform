-- Add yourself as admin
-- Replace YOUR_USER_ID with your actual user ID from the users table

-- First, let's see your user ID (run this query first to get your user ID):
-- SELECT id, discord_username, discord_id FROM users WHERE is_active = true;

-- Insert your user as admin
INSERT INTO public.admin_users (user_id, discord_id, role, permissions, is_active)
VALUES (
  '498b45ad-40b6-4bf2-8034-5bff73e6b74c',
  '1392850552416768072',
  'super_admin',
  ARRAY['read', 'write', 'delete', 'manage_users'],
  true
)
ON CONFLICT (user_id) DO UPDATE
SET 
  role = 'super_admin',
  permissions = ARRAY['read', 'write', 'delete', 'manage_users'],
  is_active = true,
  updated_at = now();

-- 또는 직접 user_id를 알고 있다면:
-- INSERT INTO public.admin_users (user_id, discord_id, role, permissions, is_active)
-- VALUES (
--   'YOUR_USER_ID_HERE',
--   'YOUR_DISCORD_ID_HERE',
--   'super_admin',
--   ARRAY['read', 'write', 'delete', 'manage_users'],
--   true
-- )
-- ON CONFLICT (user_id) DO UPDATE
-- SET 
--   role = 'super_admin',
--   permissions = ARRAY['read', 'write', 'delete', 'manage_users'],
--   is_active = true,
--   updated_at = now();


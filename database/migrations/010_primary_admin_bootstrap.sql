-- Preserve the primary admin profile whenever the Auth user already exists.
-- Passwords are intentionally managed only by the server-side login bootstrap.
INSERT INTO public.profiles(id,email,full_name,role,account_status)
SELECT u.id,
       'rohullahr914@gmail.com',
       COALESCE(NULLIF(u.raw_user_meta_data->>'full_name',''),'SoulX Administrator'),
       'admin',
       'active'
FROM auth.users u
WHERE lower(u.email)='rohullahr914@gmail.com'
ON CONFLICT (id) DO UPDATE
SET email=EXCLUDED.email,
    role='admin',
    account_status='active';
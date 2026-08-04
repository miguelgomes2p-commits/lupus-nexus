INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'miguelgomes2p@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
DELETE FROM public.user_roles r USING auth.users u
WHERE r.user_id = u.id AND u.email = 'miguelgomes2p@gmail.com' AND r.role = 'comercial';
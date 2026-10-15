-- =====================================================================
-- Make your login the owner.
-- 1) First create the user: Supabase > Authentication > Users > Add user
--    (tick "Auto Confirm User").
-- 2) Change the email below to that SAME email, then Run.
-- =====================================================================
insert into public.owners (user_id)
select id from auth.users where email = 'PUT-YOUR-OWNER-EMAIL-HERE'
on conflict do nothing;

-- Check: this should show 1 row with your email.
select u.email from public.owners o join auth.users u on u.id = o.user_id;

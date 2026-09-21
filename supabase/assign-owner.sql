-- First sign in on the site, then copy the UUID from Supabase Authentication > Users.
-- Replace the UUID below with YOUR existing account's ID, then run in the SQL editor.
-- Only one owner can exist. This deliberately fails if another owner is already set.
insert into private.site_owner (user_id)
values ('REPLACE_WITH_YOUR_USER_UUID'::uuid);

select u.id, u.email
from private.site_owner o join auth.users u on u.id = o.user_id;

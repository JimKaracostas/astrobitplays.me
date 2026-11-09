-- Enable multiple administrators in private.site_owner
begin;
alter table private.site_owner drop constraint if exists site_owner_singleton_check;
alter table private.site_owner drop constraint if exists site_owner_pkey;
alter table private.site_owner drop column if exists singleton;
alter table private.site_owner add primary key (user_id);
commit;

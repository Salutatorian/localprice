-- Server-side receipt work uses the service_role client. New CLI/cloud
-- defaults no longer auto-grant public tables to Data API roles.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

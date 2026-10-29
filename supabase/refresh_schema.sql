-- Execute this in Supabase SQL Editor after changing table columns.
-- It forces PostgREST to reload its schema cache.
notify pgrst, 'reload schema';

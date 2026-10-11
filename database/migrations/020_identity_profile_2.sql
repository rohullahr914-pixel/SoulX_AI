-- Additive identity profile fields. Existing accounts and ownership policies are preserved.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_website_url_safe;
ALTER TABLE profiles ADD CONSTRAINT profiles_website_url_safe CHECK (website_url IS NULL OR (length(website_url) <= 500 AND website_url ~ '^https://'));
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_cover_url_safe;
ALTER TABLE profiles ADD CONSTRAINT profiles_cover_url_safe CHECK (cover_url IS NULL OR (length(cover_url) <= 1000 AND cover_url ~ '^https://'));

GRANT UPDATE(display_name,bio,avatar_data_url,profile_visibility,username,cover_url,website_url,social_links) ON profiles TO authenticated;

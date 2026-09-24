CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type varchar(40) NOT NULL CHECK (event_type IN ('page_view', 'login', 'signup')),
  path varchar(500) NOT NULL,
  country varchar(120) NOT NULL DEFAULT 'Unknown',
  device varchar(40) NOT NULL DEFAULT 'Unknown',
  browser varchar(80) NOT NULL DEFAULT 'Unknown',
  referrer varchar(500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_created_idx ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_type_path_idx ON analytics_events(event_type, path);
CREATE INDEX IF NOT EXISTS analytics_events_country_idx ON analytics_events(country);

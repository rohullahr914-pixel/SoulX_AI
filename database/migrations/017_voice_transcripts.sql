-- Keep committed user and agent transcripts in the same conversation history.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_session_id uuid REFERENCES voice_sessions(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_event_id integer;

CREATE UNIQUE INDEX IF NOT EXISTS messages_voice_event_idx
  ON messages(voice_session_id, voice_event_id)
  WHERE voice_session_id IS NOT NULL AND voice_event_id IS NOT NULL;

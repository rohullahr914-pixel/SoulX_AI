-- Each persona may use a dedicated ElevenLabs Conversational AI agent.
-- This is deliberately separate from voice_id, which is only a TTS override.
ALTER TABLE personas ADD COLUMN IF NOT EXISTS voice_agent_id text;
ALTER TABLE personas ADD CONSTRAINT personas_voice_agent_id_format
  CHECK (voice_agent_id IS NULL OR voice_agent_id ~ '^agent_[A-Za-z0-9]+$') NOT VALID;

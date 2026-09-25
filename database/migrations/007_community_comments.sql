-- Additive Community extension. Public feed content continues to use shared_answers.
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL REFERENCES shared_answers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_answer_created_idx ON comments(answer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS comments_user_created_idx ON comments(user_id, created_at DESC);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS comments_public_read ON comments;
CREATE POLICY comments_public_read ON comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM shared_answers a
    WHERE a.id = answer_id
      AND a.is_public
      AND public_creator(a.user_id)
      AND public_persona(a.persona_slug)
  )
);
DROP POLICY IF EXISTS comments_owner_insert ON comments;
CREATE POLICY comments_owner_insert ON comments FOR INSERT
  WITH CHECK (
    user_id = social_uid()
    AND EXISTS (
      SELECT 1 FROM shared_answers a
      WHERE a.id = answer_id
        AND a.is_public
        AND public_creator(a.user_id)
        AND public_persona(a.persona_slug)
    )
  );
DROP POLICY IF EXISTS comments_owner_delete ON comments;
CREATE POLICY comments_owner_delete ON comments FOR DELETE USING (user_id = social_uid());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT ON comments TO anon, authenticated;
    GRANT INSERT, DELETE ON comments TO authenticated;
  END IF;
END $$;

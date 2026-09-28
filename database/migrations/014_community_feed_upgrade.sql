-- Community feed upgrade. Extends the existing network; it does not create a parallel social graph.
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS discussion_id uuid;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS challenge_id uuid REFERENCES challenges(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS community_post_personas (
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  persona_id text NOT NULL REFERENCES personas(slug) ON DELETE CASCADE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, persona_id)
);

CREATE INDEX IF NOT EXISTS community_posts_published_created_idx
  ON community_posts (created_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS community_comments_post_parent_created_idx
  ON community_comments (post_id, parent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_likes_post_created_idx ON community_post_likes (post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_bookmarks_user_created_idx ON community_post_bookmarks (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_shares_post_created_idx ON community_post_shares (post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_post_personas_persona_idx ON community_post_personas (persona_id, created_at DESC);

ALTER TABLE community_post_personas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS community_post_personas_read ON community_post_personas;
CREATE POLICY community_post_personas_read ON community_post_personas FOR SELECT USING (true);
DROP POLICY IF EXISTS community_post_personas_owner_insert ON community_post_personas;
CREATE POLICY community_post_personas_owner_insert ON community_post_personas FOR INSERT WITH CHECK (invited_by = auth.uid() OR community_admin());
DROP POLICY IF EXISTS community_post_personas_owner_delete ON community_post_personas;
CREATE POLICY community_post_personas_owner_delete ON community_post_personas FOR DELETE USING (invited_by = auth.uid() OR community_admin());
GRANT SELECT, INSERT, DELETE ON community_post_personas TO authenticated;

-- These are the three requested weekly community challenges. Existing challenge machinery
-- remains the source of submissions, XP, scores, and leaderboard updates.
INSERT INTO challenges (persona_slug, question, difficulty, xp_reward, deadline, category, is_public, is_active)
SELECT v.persona_slug, v.question, 'Medium', v.xp_reward, now() + interval '7 days', v.category, true, true
FROM (VALUES
  ('albert-einstein', 'If humanity could solve one scientific problem this century, which one should it be — and why?', 100, 'Science'),
  ('sherlock-holmes', 'You enter a room and have only 30 seconds to observe it. What details would you examine first to understand the person who lives there?', 100, 'Logic'),
  ('leonardo-da-vinci', 'Choose one everyday object and redesign it for the year 2050. What would you change, and why?', 125, 'Design')
) AS v(persona_slug, question, xp_reward, category)
WHERE EXISTS (SELECT 1 FROM personas p WHERE p.slug = v.persona_slug)
ON CONFLICT (persona_slug, week_start) DO UPDATE SET
  question = EXCLUDED.question, difficulty = EXCLUDED.difficulty, xp_reward = EXCLUDED.xp_reward,
  deadline = EXCLUDED.deadline, category = EXCLUDED.category, is_public = true, is_active = true;

INSERT INTO challenge_keys (challenge_id, expected_answer)
SELECT c.id, 'Evaluate the submission for clear reasoning, practical detail, originality, and a direct response to the prompt.'
FROM challenges c
WHERE c.question IN (
  'If humanity could solve one scientific problem this century, which one should it be — and why?',
  'You enter a room and have only 30 seconds to observe it. What details would you examine first to understand the person who lives there?',
  'Choose one everyday object and redesign it for the year 2050. What would you change, and why?'
)
ON CONFLICT (challenge_id) DO UPDATE SET expected_answer = EXCLUDED.expected_answer;

-- Google sign-in: link a Google account to a user. OAuth users get an unusable
-- random password_hash (so the NOT NULL constraint holds and password login
-- fails for them). A partial unique index allows many NULLs but one row per
-- google_id.
ALTER TABLE users ADD COLUMN google_id TEXT;
CREATE UNIQUE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

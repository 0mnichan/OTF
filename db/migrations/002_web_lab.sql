-- Web-based labs: a scenario the browser terminal simulates, so rooms are
-- playable with no Docker. Stored as JSON: {scenario, briefing}.
ALTER TABLE rooms ADD COLUMN web_lab TEXT;

CREATE VIRTUAL TABLE statements_fts USING fts5(
  title,
  body_tokenized,
  content='statements',
  content_rowid='id',
  tokenize='unicode61'
);
--> statement-breakpoint
CREATE TRIGGER statements_ai AFTER INSERT ON statements BEGIN
  INSERT INTO statements_fts(rowid, title, body_tokenized)
    VALUES (new.id, new.title, new.body_tokenized);
END;
--> statement-breakpoint
CREATE TRIGGER statements_ad AFTER DELETE ON statements BEGIN
  INSERT INTO statements_fts(statements_fts, rowid, title, body_tokenized)
    VALUES ('delete', old.id, old.title, old.body_tokenized);
END;
--> statement-breakpoint
CREATE TRIGGER statements_au AFTER UPDATE ON statements BEGIN
  INSERT INTO statements_fts(statements_fts, rowid, title, body_tokenized)
    VALUES ('delete', old.id, old.title, old.body_tokenized);
  INSERT INTO statements_fts(rowid, title, body_tokenized)
    VALUES (new.id, new.title, new.body_tokenized);
END;

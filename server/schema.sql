CREATE TABLE IF NOT EXISTS sheets (
	id integer primary key autoincrement,
  name text
);

CREATE TABLE IF NOT EXISTS entries (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
  sheet_id INTEGER NOT NULL REFERENCES sheets(id),
  "date" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "duration" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "url" TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entries_sheet ON entries(sheet_id);

-- Up Migration

CREATE TABLE usage_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  requested_at TIMESTAMPTZ NOT NULL,
  filter TEXT NOT NULL CHECK (filter IN ('long-title', 'short-title')),
  result_count INTEGER NOT NULL CHECK (result_count >= 0),
  delayed BOOLEAN NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure')),
  error_code TEXT
);

-- Down Migration

DROP TABLE usage_events;

-- Up Migration

ALTER TABLE usage_events
  DROP CONSTRAINT usage_events_filter_check,
  ADD CONSTRAINT usage_events_filter_check
    CHECK (filter IN ('all', 'long-title', 'short-title'));

-- Down Migration

ALTER TABLE usage_events
  DROP CONSTRAINT usage_events_filter_check,
  ADD CONSTRAINT usage_events_filter_check
    CHECK (filter IN ('long-title', 'short-title'));

INSERT OR IGNORE INTO app_settings(key, value, value_type, group_name, description, is_public, updated_at)
VALUES
('ADSENSE_CLIENT', '', 'string', 'ads', 'AdSense publisher ID (ca-pub-xxxx)', 1, unixepoch()),
('ADSENSE_SLOT_HOME', '', 'string', 'ads', 'Ad slot ID for homepage banner', 1, unixepoch()),
('ADSENSE_SLOT_RESULT', '', 'string', 'ads', 'Ad slot ID below generation result', 1, unixepoch());

-- Fix: ensure active GLOBAL fee rule is always within effective window (avoid timezone/future effective_from)
-- Set effective_from to a fixed past date so the rule is valid for all current and future requests
UPDATE platform_fee_rule
SET effective_from = '2020-01-01 00:00:00'
WHERE scope = 'GLOBAL' AND is_active = 1;

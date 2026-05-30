ALTER TABLE user ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE user ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE user ADD COLUMN stripe_subscription_id TEXT;

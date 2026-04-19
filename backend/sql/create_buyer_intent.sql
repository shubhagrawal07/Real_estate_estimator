-- buyer_intent: buyer-side interest / alerts / area / questions (replaces buyer_engagement intent signals).
CREATE TABLE IF NOT EXISTS buyer_intent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users("userId") ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES property_estimates("propertyId") ON DELETE CASCADE,
  intent_type varchar(32) NOT NULL,
  notif_sent boolean NOT NULL DEFAULT false,
  budget int NULL,
  message varchar(300) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_buyer_intent_user_property_type UNIQUE (user_id, property_id, intent_type)
);

CREATE INDEX IF NOT EXISTS idx_buyer_intent_user_id ON buyer_intent (user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_intent_property_id ON buyer_intent (property_id);

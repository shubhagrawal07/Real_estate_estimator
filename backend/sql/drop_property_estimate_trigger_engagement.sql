-- Run manually on production DBs that were created before these columns were removed from the entity.
-- Dev/staging with synchronize:true will align schema automatically.

ALTER TABLE property_estimates DROP COLUMN IF EXISTS trigger_price;
ALTER TABLE property_estimates DROP COLUMN IF EXISTS engagement_level;

ALTER TABLE property_estimates ALTER COLUMN buyer_tracking SET DEFAULT true;

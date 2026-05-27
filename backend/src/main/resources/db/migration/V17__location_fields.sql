-- Add geocoded coordinates to orders (captured at booking time via Mapbox autocomplete)
ALTER TABLE orders
    ADD COLUMN address_lat  DOUBLE NULL,
    ADD COLUMN address_lng  DOUBLE NULL;

-- Add home location for workers (used to calculate distance to customer)
ALTER TABLE worker_profile
    ADD COLUMN home_address VARCHAR(500) NULL,
    ADD COLUMN home_lat     DOUBLE NULL,
    ADD COLUMN home_lng     DOUBLE NULL;

-- Add business location for merchants (fallback when worker has no home address)
ALTER TABLE merchant_profile
    ADD COLUMN business_address VARCHAR(500) NULL,
    ADD COLUMN business_lat     DOUBLE NULL,
    ADD COLUMN business_lng     DOUBLE NULL;

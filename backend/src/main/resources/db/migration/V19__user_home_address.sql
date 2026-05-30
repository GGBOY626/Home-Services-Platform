ALTER TABLE user_account
    ADD COLUMN home_address VARCHAR(500) NULL,
    ADD COLUMN home_lat     DOUBLE       NULL,
    ADD COLUMN home_lng     DOUBLE       NULL;

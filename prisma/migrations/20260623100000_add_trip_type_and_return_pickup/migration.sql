ALTER TABLE bookings
  ADD COLUMN trip_type VARCHAR(20) NOT NULL DEFAULT 'one-way',
  ADD COLUMN return_pickup_at DATETIME(3) NULL;

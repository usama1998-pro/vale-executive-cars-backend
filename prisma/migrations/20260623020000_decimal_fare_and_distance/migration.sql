-- Store fares to the penny and distance on exact mileage (no whole-unit rounding)
ALTER TABLE `bookings`
    MODIFY `distance_miles` DOUBLE NOT NULL,
    MODIFY `estimated_fare` DOUBLE NOT NULL;

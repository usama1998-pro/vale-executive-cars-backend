-- Short numeric booking references only (max 10 digits)
ALTER TABLE `bookings` MODIFY `booking_ref` VARCHAR(10) NOT NULL;

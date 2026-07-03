-- Limit customer note to 500 characters at database level
ALTER TABLE `bookings` MODIFY COLUMN `note` VARCHAR(500) NULL;

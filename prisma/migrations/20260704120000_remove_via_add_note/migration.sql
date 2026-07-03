-- Drop via stopover field and add optional customer note
ALTER TABLE `bookings` DROP COLUMN `via`;
ALTER TABLE `bookings` ADD COLUMN `note` TEXT NULL AFTER `dropoff_to`;

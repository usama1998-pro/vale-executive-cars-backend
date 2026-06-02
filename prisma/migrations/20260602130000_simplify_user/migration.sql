-- Legacy schema cleanup (skip if you created the DB from the updated init migration only)
ALTER TABLE `users` DROP COLUMN `full_name`;
ALTER TABLE `users` DROP COLUMN `phone`;
ALTER TABLE `users` DROP COLUMN `is_super_admin`;

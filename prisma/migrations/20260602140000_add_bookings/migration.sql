-- CreateTable
CREATE TABLE `bookings` (
    `id` VARCHAR(191) NOT NULL,
    `booking_ref` VARCHAR(191) NOT NULL,
    `customer_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `contact_number` VARCHAR(191) NOT NULL,
    `pickup_from` VARCHAR(191) NOT NULL,
    `dropoff_to` VARCHAR(191) NOT NULL,
    `distance_miles` INTEGER NOT NULL,
    `estimated_fare` INTEGER NOT NULL,
    `vehicle_type` VARCHAR(191) NOT NULL,
    `via` VARCHAR(191) NOT NULL,
    `preferred_pickup_at` DATETIME(3) NOT NULL,
    `status` ENUM('pending', 'submitted', 'accepted', 'rejected', 'completed', 'cancelled') NOT NULL DEFAULT 'submitted',
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bookings_booking_ref_key`(`booking_ref`),
    INDEX `bookings_status_created_at_idx`(`status`, `created_at`),
    INDEX `bookings_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

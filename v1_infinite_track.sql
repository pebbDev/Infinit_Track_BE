-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 25, 2025 at 08:42 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";

START TRANSACTION;

SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */
;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */
;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */
;
/*!40101 SET NAMES utf8mb4 */
;

--
-- Database: `v1_infinite_track`
--

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
    `id_attendance` int(11) NOT NULL,
    `user_id` int(11) NOT NULL,
    `category_id` int(11) NOT NULL,
    `status_id` int(11) NOT NULL,
    `location_id` int(11) DEFAULT NULL,
    `booking_id` int(11) DEFAULT NULL,
    `time_in` datetime NOT NULL,
    `time_out` datetime NOT NULL,
    `work_hour` float(5, 2) NOT NULL,
    `attendance_date` date NOT NULL,
    `notes` text NOT NULL,
    `created_at` datetime NOT NULL,
    `updated_at` datetime NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_categories`
--

CREATE TABLE `attendance_categories` (
    `id_attendance_categories` int(11) NOT NULL,
    `category_name` varchar(50) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `attendance_categories`
--

INSERT INTO
    `attendance_categories` (
        `id_attendance_categories`,
        `category_name`
    )
VALUES (1, 'Work From Office'),
    (2, 'Work From Home'),
    (3, 'Work From Anywhere');

-- --------------------------------------------------------

--
-- Table structure for table `attendance_statuses`
--

CREATE TABLE `attendance_statuses` (
    `id_attendance_status` int(11) NOT NULL,
    `attendance_status_name` varchar(50) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `attendance_statuses`
--

INSERT INTO
    `attendance_statuses` (
        `id_attendance_status`,
        `attendance_status_name`
    )
VALUES (1, 'ontime'),
    (2, 'late'),
    (3, 'alpa');

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
    `booking_id` int(11) NOT NULL,
    `user_id` int(11) NOT NULL,
    `schedule_date` date NOT NULL,
    `location_id` int(11) NOT NULL,
    `status` int(11) NOT NULL,
    `notes` text NOT NULL,
    `created_at` datetime NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `booking_status`
--

CREATE TABLE `booking_status` (
    `id_booking_status` int(11) NOT NULL,
    `name_status` varchar(100) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `booking_status`
--

INSERT INTO
    `booking_status` (
        `id_booking_status`,
        `name_status`
    )
VALUES (1, 'approved'),
    (2, 'rejected');

-- --------------------------------------------------------

--
-- Table structure for table `divisions`
--

CREATE TABLE `divisions` (
    `id_divisions` int(11) NOT NULL,
    `division_name` varchar(100) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `locations`
--

CREATE TABLE `locations` (
    `location_id` int(11) NOT NULL,
    `latitude` decimal(10, 6) NOT NULL,
    `longitude` decimal(10, 6) NOT NULL,
    `radius` float(5, 2) NOT NULL,
    `id_attendance_categories` int(11) NOT NULL,
    `description` text NOT NULL,
    `user_id` int(11) DEFAULT NULL,
    `created_at` datetime NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `photos`
--

CREATE TABLE `photos` (
    `id_photos` int(11) NOT NULL,
    `user_id` int(11) NOT NULL,
    `file_path` text NOT NULL,
    `photo_updated_at` datetime NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `positions`
--

CREATE TABLE `positions` (
    `id_positions` int(11) NOT NULL,
    `id_programs` int(11) NOT NULL,
    `position_name` varchar(100) NOT NULL
);

--
-- Dumping data for table `positions`
--

INSERT INTO
    `positions` (
        `id_positions`,
        `id_programs`,
        `position_name`
    )
VALUES (
        1,
        1,
        'Head of Digital Creative'
    ),
    (
        2,
        1,
        'Lead of Digital Enterprise'
    ),
    (
        3,
        1,
        'Lead of Social Media and Public Relation'
    ),
    (4, 1, 'Lead of Operational'),
    (
        5,
        2,
        'Head of Program Development'
    ),
    (
        6,
        2,
        'Head of Program Development and Relation'
    ),
    (7, 2, 'Program Director'),
    (8, 2, 'Lead of Operational'),
    (9, 3, 'Head of Web & Mobile'),
    (
        10,
        3,
        'Lead of Technical Mobile'
    ),
    (
        11,
        3,
        'Mentor Technical Mobile'
    ),
    (12, 3, 'Lead Technical Web'),
    (13, 3, 'Mentor Technical Web'),
    (14, 3, 'Mentor UI/UX'),
    (15, 3, 'Lead of UI/UX Design'),
    (
        16,
        3,
        'Lead Technical Mobile'
    ),
    (
        17,
        3,
        'Mobile Developer Intern'
    );

-- --------------------------------------------------------

--
-- Table structure for table `programs`
--

CREATE TABLE `programs` (
    `id_programs` int(11) NOT NULL,
    `program_name` varchar(100) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `programs`
--

INSERT INTO
    `programs` (`id_programs`, `program_name`)
VALUES (1, 'Digital Creative'),
    (
        2,
        'Program Development & Relation'
    ),
    (3, 'Professional Mentor');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
    `id_roles` int(11) NOT NULL,
    `role_name` varchar(50) NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO
    `roles` (`id_roles`, `role_name`)
VALUES (1, 'Management'),
    (2, 'Internship'),
    (3, 'Employee'),
    (4, 'Admin');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
    `id_users` int(11) NOT NULL,
    `full_name` varchar(255) NOT NULL,
    `email` varchar(100) NOT NULL,
    `password` char(100) NOT NULL,
    `phone` varchar(100) NOT NULL,
    `nip_nim` varchar(45) NOT NULL,
    `id_roles` int(11) DEFAULT NULL,
    `id_programs` int(11) NOT NULL,
    `id_position` int(11) NOT NULL,
    `id_divisions` int(11) DEFAULT NULL,
    `id_photos` int(11) NOT NULL,
    `created_at` datetime NOT NULL,
    `updated_at` datetime DEFAULT NULL,
    `deleted_at` datetime DEFAULT NULL,
    `created_by` int(11) DEFAULT NULL,
    `updated_by` int(11) DEFAULT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
ADD KEY `fk_attendance_user_id` (`user_id`),
ADD KEY `fk_attendance_category_id` (`category_id`),
ADD KEY `fk_attendance_location_id` (`location_id`),
ADD KEY `fk_attendance_booking_id` (`booking_id`),
ADD KEY `fk_attendance_status_id` (`status_id`);

--
-- Indexes for table `attendance_categories`
--
ALTER TABLE `attendance_categories`
ADD PRIMARY KEY (`id_attendance_categories`);

--
-- Indexes for table `attendance_statuses`
--
ALTER TABLE `attendance_statuses`
ADD PRIMARY KEY (`id_attendance_status`);

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
ADD PRIMARY KEY (`booking_id`),
ADD KEY `fk_bookings_user_id` (`user_id`),
ADD KEY `fk_bookings_location_id` (`location_id`);

--
-- Indexes for table `booking_status`
--
ALTER TABLE `booking_status` ADD PRIMARY KEY (`id_booking_status`);

--
-- Indexes for table `divisions`
--
ALTER TABLE `divisions` ADD PRIMARY KEY (`id_divisions`);

--
-- Indexes for table `locations`
--
ALTER TABLE `locations`
ADD PRIMARY KEY (`location_id`),
ADD KEY `fk_location_id_attendance_categories` (`id_attendance_categories`),
ADD KEY `fk_location_id_users` (`user_id`);

--
-- Indexes for table `photos`
--
ALTER TABLE `photos` ADD PRIMARY KEY (`id_photos`);

--
-- Indexes for table `positions`
--
ALTER TABLE `positions`
ADD PRIMARY KEY (`id_positions`),
ADD KEY `  fk_positions` (`id_programs`) USING BTREE;

--
-- Indexes for table `programs`
--
ALTER TABLE `programs` ADD PRIMARY KEY (`id_programs`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles` ADD PRIMARY KEY (`id_roles`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
ADD PRIMARY KEY (`id_users`),
ADD UNIQUE KEY `email_UNIQUE` (`email`),
ADD KEY `fk_users_programs` (`id_programs`),
ADD KEY `fk_users_positions` (`id_position`),
ADD KEY `fk_users_photos` (`id_photos`),
ADD KEY `fk_users_updated_by` (`updated_by`),
ADD KEY `fk_users_created_by` (`created_by`),
ADD KEY `fk_users_divisions` (`id_divisions`),
ADD KEY `fk_users_id_roles` (`id_roles`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `attendance_categories`
--
ALTER TABLE `attendance_categories`
MODIFY `id_attendance_categories` int(11) NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 5;

--
-- AUTO_INCREMENT for table `attendance_statuses`
--
ALTER TABLE `attendance_statuses`
MODIFY `id_attendance_status` int(11) NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 4;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
MODIFY `booking_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `booking_status`
--
ALTER TABLE `booking_status`
MODIFY `id_booking_status` int(11) NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 3;

--
-- AUTO_INCREMENT for table `divisions`
--
ALTER TABLE `divisions`
MODIFY `id_divisions` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `locations`
--
ALTER TABLE `locations`
MODIFY `location_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `photos`
--
ALTER TABLE `photos`
MODIFY `id_photos` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `positions`
--
ALTER TABLE `positions`
MODIFY `id_positions` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `programs`
--
ALTER TABLE `programs`
MODIFY `id_programs` int(11) NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 6;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
MODIFY `id_roles` int(11) NOT NULL AUTO_INCREMENT,
AUTO_INCREMENT = 8;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
MODIFY `id_users` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
ADD CONSTRAINT `fk_attendance_booking_id` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`),
ADD CONSTRAINT `fk_attendance_category_id` FOREIGN KEY (`category_id`) REFERENCES `attendance_categories` (`id_attendance_categories`),
ADD CONSTRAINT `fk_attendance_location_id` FOREIGN KEY (`location_id`) REFERENCES `locations` (`location_id`),
ADD CONSTRAINT `fk_attendance_status_id` FOREIGN KEY (`status_id`) REFERENCES `attendance_statuses` (`id_attendance_status`),
ADD CONSTRAINT `fk_attendance_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id_users`);

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
ADD CONSTRAINT `fk_bookings_location_id` FOREIGN KEY (`location_id`) REFERENCES `locations` (`location_id`),
ADD CONSTRAINT `fk_bookings_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id_users`);

--
-- Constraints for table `locations`
--
ALTER TABLE `locations`
ADD CONSTRAINT `fk_location_id_attendance_categories` FOREIGN KEY (`id_attendance_categories`) REFERENCES `attendance_categories` (`id_attendance_categories`),
ADD CONSTRAINT `fk_location_id_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id_users`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
ADD CONSTRAINT `fk_users_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id_users`) ON DELETE SET NULL,
ADD CONSTRAINT `fk_users_divisions` FOREIGN KEY (`id_divisions`) REFERENCES `divisions` (`id_divisions`) ON DELETE SET NULL,
ADD CONSTRAINT `fk_users_id_roles` FOREIGN KEY (`id_roles`) REFERENCES `roles` (`id_roles`) ON DELETE SET NULL,
ADD CONSTRAINT `fk_users_photos` FOREIGN KEY (`id_photos`) REFERENCES `photos` (`id_photos`),
ADD CONSTRAINT `fk_users_positions` FOREIGN KEY (`id_position`) REFERENCES `positions` (`id_positions`),
ADD CONSTRAINT `fk_users_programs` FOREIGN KEY (`id_programs`) REFERENCES `programs` (`id_programs`),
ADD CONSTRAINT `fk_users_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id_users`);

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */
;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */
;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */
;
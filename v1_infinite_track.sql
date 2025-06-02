-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 02, 2025 at 02:07 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

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
  `work_hour` float(5,2) NOT NULL,
  `attendance_date` date NOT NULL,
  `notes` text NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_categories`
--

CREATE TABLE `attendance_categories` (
  `id_attendance_categories` int(11) NOT NULL,
  `category_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance_categories`
--

INSERT INTO `attendance_categories` (`id_attendance_categories`, `category_name`) VALUES
(1, 'Work From Office'),
(2, 'Work From Home'),
(3, 'Work From Anywhere');

-- --------------------------------------------------------

--
-- Table structure for table `attendance_statuses`
--

CREATE TABLE `attendance_statuses` (
  `id_attendance_status` int(11) NOT NULL,
  `attendance_status_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance_statuses`
--

INSERT INTO `attendance_statuses` (`id_attendance_status`, `attendance_status_name`) VALUES
(1, 'ontime'),
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `booking_status`
--

CREATE TABLE `booking_status` (
  `id_booking_status` int(11) NOT NULL,
  `name_status` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `booking_status`
--

INSERT INTO `booking_status` (`id_booking_status`, `name_status`) VALUES
(1, 'approved'),
(2, 'rejected'),
(3, 'pending');

-- --------------------------------------------------------

--
-- Table structure for table `divisions`
--

CREATE TABLE `divisions` (
  `id_divisions` int(11) NOT NULL,
  `division_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `locations`
--

CREATE TABLE `locations` (
  `location_id` int(11) NOT NULL,
  `latitude` decimal(10,6) NOT NULL,
  `longitude` decimal(10,6) NOT NULL,
  `radius` float(5,2) NOT NULL,
  `id_attendance_categories` int(11) NOT NULL,
  `description` text NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `locations`
--

INSERT INTO `locations` (`location_id`, `latitude`, `longitude`, `radius`, `id_attendance_categories`, `description`, `user_id`, `created_at`) VALUES
(1, -6.208800, 106.845600, 150.00, 2, 'Rumah utama', 2, '2025-05-26 07:52:49'),
(2, -6.208800, 106.845600, 150.00, 2, 'Rumah utama', 3, '2025-05-26 08:00:09'),
(3, -6.208800, 106.845600, 100.00, 2, 'Rumah utama', 4, '2025-05-26 08:30:37'),
(4, -6.208800, 106.845600, 100.00, 2, 'Rumah utama', 7, '2025-05-27 08:04:50'),
(5, -6.208800, 106.845600, 100.00, 2, 'Rumah utama', 8, '2025-05-27 08:12:31'),
(6, -6.208800, 106.845600, 100.00, 2, 'Rumah utama', 9, '2025-05-27 11:36:51'),
(7, -6.208800, 106.845600, 100.00, 2, 'Rumah utama', 10, '2025-05-27 13:01:05'),
(8, -6.208800, 106.845600, 112.00, 2, 'Rumah utama', 11, '2025-06-02 05:30:25'),
(9, -6.208800, 106.845600, 112.00, 2, 'Rumah utama', 12, '2025-06-02 05:36:11');

-- --------------------------------------------------------

--
-- Table structure for table `photos`
--

CREATE TABLE `photos` (
  `id_photos` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `file_path` text NOT NULL,
  `photo_updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `photos`
--

INSERT INTO `photos` (`id_photos`, `user_id`, `file_path`, `photo_updated_at`) VALUES
(5, 2, 'uploads\\face\\face-1748245969655-859492489.jpg', '2025-05-26 07:52:49'),
(6, 3, 'uploads\\face\\face-1748246409017-181078066.jpg', '2025-05-26 08:00:09'),
(7, 4, 'uploads\\face\\face-1748248237329-37107794.jpg', '2025-05-26 08:30:37'),
(8, 7, 'uploads\\face\\face-1748333090217-344943194.jpg', '2025-05-27 08:04:50'),
(9, 8, 'uploads\\face\\face-1748333551027-218673770.jpg', '2025-05-27 08:12:31'),
(10, 9, 'uploads\\face\\face-1748345811412-863167318.jpg', '2025-05-27 11:36:51'),
(11, 10, 'uploads\\face\\face-1748350865849-90443260.jpg', '2025-05-27 13:01:05'),
(12, 11, 'uploads\\face\\face-1748842225018-402004703.jpg', '2025-06-02 05:30:25'),
(13, 12, 'uploads\\face\\face-1748842571395-605448114.jpg', '2025-06-02 05:36:11');

-- --------------------------------------------------------

--
-- Table structure for table `positions`
--

CREATE TABLE `positions` (
  `id_positions` int(11) NOT NULL,
  `id_programs` int(11) NOT NULL,
  `position_name` varchar(100) NOT NULL
) ;

--
-- Dumping data for table `positions`
--

INSERT INTO `positions` (`id_positions`, `id_programs`, `position_name`) VALUES
(1, 1, 'Head of Digital Creative'),
(2, 1, 'Lead of Digital Enterprise'),
(3, 1, 'Lead of Social Media and Public Relation'),
(4, 1, 'Lead of Operational'),
(5, 2, 'Head of Program Development'),
(6, 2, 'Head of Program Development and Relation'),
(7, 2, 'Program Director'),
(8, 2, 'Lead of Operational'),
(9, 3, 'Head of Web & Mobile'),
(10, 3, 'Lead of Technical Mobile'),
(11, 3, 'Mentor Technical Mobile'),
(12, 3, 'Lead Technical Web'),
(13, 3, 'Mentor Technical Web'),
(14, 3, 'Mentor UI/UX'),
(15, 3, 'Lead of UI/UX Design'),
(16, 3, 'Lead Technical Mobile'),
(17, 3, 'Mobile Developer Intern');

-- --------------------------------------------------------

--
-- Table structure for table `programs`
--

CREATE TABLE `programs` (
  `id_programs` int(11) NOT NULL,
  `program_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `programs`
--

INSERT INTO `programs` (`id_programs`, `program_name`) VALUES
(1, 'Digital Creative'),
(2, 'Program Development & Relation'),
(3, 'Professional Mentor');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id_roles` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id_roles`, `role_name`) VALUES
(1, 'Management'),
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id_users`, `full_name`, `email`, `password`, `phone`, `nip_nim`, `id_roles`, `id_programs`, `id_position`, `id_divisions`, `id_photos`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`) VALUES
(2, 'Raihan Saputra', 'user@email.com', '$2b$10$Rwy/GOtG9jsx7FdqCDpFWu83tDpsqhZqXUpbMfJAQsnOPr.eDbYMq', '081234567895', '12345678FF', 2, 2, 3, NULL, 5, '2025-05-26 07:52:49', '2025-05-26 07:52:49', NULL, NULL, NULL),
(3, 'februyadi', 'user12@email.com', '$2b$10$h7aC2UM8dS3ljZiFXeMSB.2k0/G0OBTsVzFzAJxjK8QgTVf8lKTei', '081234567895', '12345678FFg', 2, 2, 3, NULL, 6, '2025-05-26 08:00:09', '2025-05-26 08:00:09', NULL, NULL, NULL),
(4, 'Febriyadi', 'febriyadi@email.com', '$2b$10$kfb803UzxNKn2QsZrrS0C.UZqmGr0Ltjvzxa9ETHn.y44yiF.ETTe', '08539507795', 'F55121082', 2, 2, 3, NULL, 7, '2025-05-26 08:30:37', '2025-05-26 08:30:37', NULL, NULL, NULL),
(7, 'Febriyadi', 'febriyadi05@email.com', '$2b$10$z71ReWHCiBuN2am7vZfa6eb8qi.d1iOgxGLaJxz5.mSYfxmjGBr4G', '08539507795', 'F55121082c', 2, 2, 3, NULL, 8, '2025-05-27 08:04:50', '2025-05-27 08:04:50', NULL, NULL, NULL),
(8, 'Febriyadi', 'febriyadi055@email.com', '$2b$10$8yfwNHQy5umCQwR/.JlQBeW6qA7ngd9jXIbnvcErbXnT0jg.M8pvm', '08539507795', 'F55121083', 2, 2, 3, NULL, 9, '2025-05-27 08:12:31', '2025-05-27 08:12:31', NULL, NULL, NULL),
(9, 'Febriyadi', 'febriyadi056@email.com', '$2b$10$8RKX6pMtuoYZNpK7iEJ51uvLulV9ea/ZojF264Iy2gyeStvxKxVGe', '08539507795', 'F55121082cd', 2, 2, 3, NULL, 10, '2025-05-27 11:36:51', '2025-05-27 11:36:51', NULL, NULL, NULL),
(10, 'Febriyadi', 'febriyadi05d6@email.com', '$2b$10$/gtczjfTLkJ2FJw3CRNKeeEDvGhNn8udgi8exGvV9Y95q2J5urChK', '08539507795', 'F55121082cdgg', 2, 2, 3, NULL, 11, '2025-05-27 13:01:05', '2025-05-27 13:01:05', NULL, NULL, NULL),
(11, 'Febriyadi', 'diana123@email.com', '$2b$10$xwIzrjmTz42ubfJHQztCx.oLiFVVGkWj/qmJbFn0WiGqdxvmE2cUW', '08539507795', 'F551210831', 1, 2, 3, NULL, 12, '2025-06-02 05:30:25', '2025-06-02 05:30:25', NULL, NULL, NULL),
(12, 'Diana', '240@email.com', '$2b$10$quGEj6mvakhQnSt.Yl8Y8.t5CCIzoMRrqsJRwe6Ml6skOm2Q.SE7.', '08539507795', 'F551210832', 4, 2, 3, NULL, 13, '2025-06-02 05:36:11', '2025-06-02 05:36:11', NULL, NULL, NULL);

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
  ADD KEY `fk_bookings_location_id` (`location_id`),
  ADD KEY `fk_bookings_status_booking` (`status`);

--
-- Indexes for table `booking_status`
--
ALTER TABLE `booking_status`
  ADD PRIMARY KEY (`id_booking_status`);

--
-- Indexes for table `divisions`
--
ALTER TABLE `divisions`
  ADD PRIMARY KEY (`id_divisions`);

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
ALTER TABLE `photos`
  ADD PRIMARY KEY (`id_photos`),
  ADD KEY `fk_photo_id_photo` (`user_id`);

--
-- Indexes for table `positions`
--
ALTER TABLE `positions`
  ADD PRIMARY KEY (`id_positions`),
  ADD KEY `  fk_positions` (`id_programs`) USING BTREE;

--
-- Indexes for table `programs`
--
ALTER TABLE `programs`
  ADD PRIMARY KEY (`id_programs`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id_roles`);

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
  MODIFY `id_attendance_categories` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `attendance_statuses`
--
ALTER TABLE `attendance_statuses`
  MODIFY `id_attendance_status` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `booking_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `booking_status`
--
ALTER TABLE `booking_status`
  MODIFY `id_booking_status` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `divisions`
--
ALTER TABLE `divisions`
  MODIFY `id_divisions` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `locations`
--
ALTER TABLE `locations`
  MODIFY `location_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `photos`
--
ALTER TABLE `photos`
  MODIFY `id_photos` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `positions`
--
ALTER TABLE `positions`
  MODIFY `id_positions` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `programs`
--
ALTER TABLE `programs`
  MODIFY `id_programs` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id_roles` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id_users` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

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
  ADD CONSTRAINT `fk_bookings_status_booking` FOREIGN KEY (`status`) REFERENCES `booking_status` (`id_booking_status`),
  ADD CONSTRAINT `fk_bookings_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id_users`);

--
-- Constraints for table `locations`
--
ALTER TABLE `locations`
  ADD CONSTRAINT `fk_location_id_attendance_categories` FOREIGN KEY (`id_attendance_categories`) REFERENCES `attendance_categories` (`id_attendance_categories`),
  ADD CONSTRAINT `fk_location_id_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id_users`);

--
-- Constraints for table `photos`
--
ALTER TABLE `photos`
  ADD CONSTRAINT `fk_photo_id_photo` FOREIGN KEY (`user_id`) REFERENCES `users` (`id_users`);

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

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

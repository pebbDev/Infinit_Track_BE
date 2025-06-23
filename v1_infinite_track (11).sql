-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 23, 2025 at 02:30 PM
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
  `time_out` datetime DEFAULT NULL,
  `work_hour` float(5,2) NOT NULL,
  `attendance_date` date NOT NULL,
  `notes` text NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`id_attendance`, `user_id`, `category_id`, `status_id`, `location_id`, `booking_id`, `time_in`, `time_out`, `work_hour`, `attendance_date`, `notes`, `created_at`, `updated_at`) VALUES
(2, 21, 1, 2, NULL, NULL, '2025-06-17 09:32:58', NULL, 0.00, '2025-06-17', 'Check-in from office', '2025-06-17 09:32:58', '2025-06-17 09:32:58'),
(3, 11, 1, 2, NULL, NULL, '2025-06-17 11:57:17', NULL, 0.00, '2025-06-17', 'Check-in from office', '2025-06-17 11:57:17', '2025-06-17 11:57:17'),
(4, 23, 1, 2, NULL, NULL, '2025-06-17 12:04:50', NULL, 0.00, '2025-06-17', 'Check-in from office', '2025-06-17 12:04:50', '2025-06-17 12:04:50'),
(5, 22, 1, 2, NULL, NULL, '2025-06-17 12:06:41', NULL, 0.00, '2025-06-17', 'Check-in from office', '2025-06-17 12:06:41', '2025-06-17 12:06:41'),
(7, 4, 2, 2, 3, NULL, '2025-06-06 14:12:05', '2025-06-07 00:00:00', 9.80, '2025-06-06', 'Check-in from office\nSesi diakhiri otomatis oleh sistem.', '2025-06-06 14:12:05', '2025-06-09 01:18:21'),
(8, 7, 1, 2, 1, NULL, '2025-06-06 16:35:07', '2025-06-07 00:00:00', 7.41, '2025-06-06', 'Check-in from office\nSesi diakhiri otomatis oleh sistem.', '2025-06-06 16:35:07', '2025-06-09 01:18:21'),
(9, 13, 1, 2, 1, NULL, '2025-06-09 18:26:02', '2025-06-09 18:26:38', 0.01, '2025-06-09', 'Check-in from office', '2025-06-09 18:26:02', '2025-06-09 18:26:02'),
(10, 13, 1, 2, 1, NULL, '2025-06-10 18:36:28', '2025-06-10 18:37:44', 0.02, '2025-06-10', 'Check-in from office', '2025-06-10 18:36:28', '2025-06-10 18:36:28'),
(11, 13, 1, 1, 1, NULL, '2025-06-18 08:50:37', '2025-06-18 08:51:36', 0.02, '2025-06-18', 'Check-in from office', '2025-06-18 08:50:37', '2025-06-18 08:50:37'),
(12, 4, 1, 2, 1, NULL, '2025-06-18 12:41:18', '2025-06-18 12:43:25', 0.04, '2025-06-18', 'Check-in from office', '2025-06-18 12:41:18', '2025-06-18 12:41:18'),
(13, 20, 1, 2, 1, NULL, '2025-06-18 16:11:17', NULL, 0.00, '2025-06-18', 'Check-in from office', '2025-06-18 16:11:17', '2025-06-18 16:11:17'),
(14, 20, 1, 2, 1, NULL, '2025-06-11 19:14:15', '2025-06-11 19:15:19', 0.02, '2025-06-11', 'Check-in from office', '2025-06-11 19:14:15', '2025-06-11 19:14:15'),
(15, 20, 3, 2, 34, 11, '2025-06-24 17:18:58', '2025-06-24 17:22:31', 0.06, '2025-06-24', 'Check-in from office', '2025-06-24 17:18:58', '2025-06-24 17:18:58'),
(16, 20, 1, 2, 1, NULL, '2025-06-26 17:27:33', '2025-06-26 17:28:39', 0.02, '2025-06-26', '', '2025-06-26 17:27:33', '2025-06-26 17:27:33'),
(17, 20, 3, 2, 40, 17, '2025-06-29 18:13:57', '2025-06-29 18:14:46', 0.01, '2025-06-29', '', '2025-06-29 18:13:57', '2025-06-29 18:13:57');

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
(3, 'alpha');

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
  `created_at` datetime NOT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL,
  `suitability_score` decimal(5,2) DEFAULT NULL,
  `suitability_label` varchar(50) DEFAULT NULL,
  `rejection_reason` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`booking_id`, `user_id`, `schedule_date`, `location_id`, `status`, `notes`, `created_at`, `approved_by`, `processed_at`, `suitability_score`, `suitability_label`, `rejection_reason`) VALUES
(2, 21, '2025-06-20', 22, 1, 'Saya ingin bersantai-santai dong', '2025-06-06 01:07:11', 12, '2025-06-06 07:17:45', NULL, NULL, NULL),
(3, 7, '2025-06-20', 25, 1, 'Saya ingin bersantai-santai dong', '2025-06-06 07:16:23', 13, '2025-06-08 11:14:12', NULL, NULL, NULL),
(7, 13, '2025-06-24', 30, 1, 'Saya ingin bersantai-santai dong', '2025-06-09 11:07:29', 12, '2025-06-09 11:08:32', NULL, NULL, NULL),
(8, 23, '2025-06-24', 31, 2, 'Saya ingin bersantai-santai dong', '2025-06-18 06:10:42', 12, '2025-06-18 06:21:50', NULL, NULL, NULL),
(9, 22, '2025-06-24', 32, 1, 'Saya ingin bersantai-santai dong', '2025-06-18 06:20:01', 22, '2025-06-18 06:20:19', NULL, NULL, NULL),
(10, 20, '2025-06-21', 33, 1, 'Saya ingin bersantai-santai dong', '2025-06-20 22:20:47', 20, '2025-06-20 10:03:20', NULL, NULL, NULL),
(11, 20, '2025-06-24', 34, 1, 'Saya ingin bersantai-santai dong', '2025-06-23 10:14:53', 20, '2025-06-23 10:15:33', NULL, NULL, NULL),
(12, 20, '2025-06-25', 35, 1, 'Saya ingin bersantai-santai dong', '2025-06-23 10:46:33', 20, '2025-06-23 11:00:40', NULL, NULL, NULL),
(13, 20, '2025-06-26', 36, 1, 'Saya ingin bersantai-santai dong', '2025-06-23 11:00:46', 20, '2025-06-23 11:01:52', NULL, NULL, NULL),
(14, 20, '2025-06-27', 37, 1, 'Saya ingin bersantai-santai dong', '2025-06-23 11:02:22', 20, '2025-06-23 11:05:22', NULL, NULL, NULL),
(15, 20, '2025-06-28', 38, 1, 'Saya ingin bersantai-santai dong', '2025-06-23 11:05:35', 20, '2025-06-23 11:09:17', NULL, NULL, NULL),
(16, 20, '2025-06-30', 39, 1, 'Saya ingin bersantai-santai dong', '2025-06-23 11:09:27', 20, '2025-06-28 11:11:47', NULL, NULL, NULL),
(17, 20, '2025-06-29', 40, 1, 'Saya ingin bersantai-santai dong', '2025-06-28 11:11:54', 20, '2025-06-28 11:12:09', NULL, NULL, NULL);

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
-- Table structure for table `discipline_scores`
--

CREATE TABLE `discipline_scores` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `period_month` int(11) NOT NULL,
  `period_year` int(11) NOT NULL,
  `discipline_score` decimal(5,2) NOT NULL,
  `discipline_label` varchar(50) DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `calculated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `divisions`
--

CREATE TABLE `divisions` (
  `id_divisions` int(11) NOT NULL,
  `division_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `divisions`
--

INSERT INTO `divisions` (`id_divisions`, `division_name`) VALUES
(1, 'Front-End Developer'),
(2, 'Back-End Developer'),
(3, 'DevOps Engineer'),
(4, 'Data Scientist'),
(5, 'UI/UX Designer'),
(6, 'Quality Assurance (QA)');

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
(1, -0.842080, 119.892640, 100.00, 1, 'Kantor Pusat Infinite Learning', NULL, '2025-06-17 13:35:22'),
(2, -6.208800, 106.845600, 150.00, 2, 'Rumah utama', 3, '2025-05-26 08:00:09'),
(3, -6.208800, 106.845600, 100.00, 2, 'Rumah utama', 4, '2025-05-26 08:30:37'),
(4, -6.208800, 106.845600, 100.00, 2, 'Rumah utama', 7, '2025-05-27 08:04:50'),
(5, -6.208800, 106.845600, 100.00, 2, 'Rumah utama', 8, '2025-05-27 08:12:31'),
(6, -6.208800, 106.845600, 100.00, 2, 'Rumah utama', 9, '2025-05-27 11:36:51'),
(7, -6.208800, 106.845600, 100.00, 2, 'Rumah utama', 10, '2025-05-27 13:01:05'),
(8, -6.208800, 106.845600, 112.00, 2, 'Rumah utama', 11, '2025-06-02 05:30:25'),
(9, -6.208800, 106.845600, 112.00, 2, 'Rumah utama', 12, '2025-06-02 05:36:11'),
(10, -6.236125, 107.000002, 100.00, 2, 'Parkir Pintu Utara Stasiun Bekasi, Jalan Perjuangan, Proyek, Margajaya, Bekasi, West Java, Java, 17141, Indonesia', 13, '2025-06-03 00:29:09'),
(11, 1.165630, 104.106725, 999.99, 2, 'Nongsa, Batam, Riau Islands, Sumatra, 29467, Indonesia', 14, '2025-06-03 08:47:18'),
(12, 1.185866, 104.102235, 999.99, 2, 'Nongsa Digital Park, Batam, Riau Islands, Sumatra, 29467, Indonesia', 15, '2025-06-03 08:55:11'),
(13, 1.181891, 104.102583, 999.99, 2, 'Jalan Hang Jebat, Nongsa, Batam, Riau Islands, Sumatra, 29467, Indonesia', 16, '2025-06-03 10:46:04'),
(14, -0.747049, 117.047842, 100.00, 2, 'Kutai Kartanegara, East Kalimantan, Kalimantan, Indonesia', 17, '2025-06-18 07:49:58'),
(15, -0.836243, 119.894654, 100.00, 2, 'Universitas Tadulako, Jalan Masjid Darul Hikmah, Boyangapa, Kecamatan Mantikulore, Palu, Central Sulawesi, Sulawesi, 94119, Indonesia', 18, '2025-06-19 09:55:33'),
(16, -6.200000, 106.816666, 100.00, 2, '', 19, '2025-06-19 10:54:12'),
(17, -6.208800, 106.845600, 112.00, 2, 'Rumah utama', 20, '2025-06-19 11:10:41'),
(18, -0.895779, 119.867997, 112.00, 2, 'Palu, Kecamatan Palu Timur, Palu, Central Sulawesi, Sulawesi, 94112, Indonesia', 21, '2025-06-19 11:23:26'),
(19, -6.200000, 106.816666, 100.00, 2, 'Rumah John Doe', 22, '2025-06-19 11:51:15'),
(20, 1.149882, 104.129794, 500.00, 2, 'Batu Besar, Batam, Riau Islands, Sumatra, 29467, Indonesia', 23, '2025-06-19 12:34:51'),
(22, -6.208800, 106.845600, 100.00, 3, 'Coffee Shop di Menteng', 21, '2025-06-06 01:07:11'),
(24, -6.208800, 106.845600, 150.00, 2, 'Rumah utama', 2, '2025-05-26 07:52:49'),
(25, -6.208800, 106.845600, 100.00, 3, 'Coffee Shop di Menteng', 7, '2025-06-06 07:16:23'),
(26, 1.132891, 104.112624, 999.99, 2, 'Jalan Hang Tuah, Batu Besar, Batam, Riau Islands, Sumatra, 29467, Indonesia', 24, '2025-06-07 11:30:36'),
(30, -6.208800, 106.845600, 100.00, 3, 'Ruko', 13, '2025-06-09 11:07:29'),
(31, -6.208800, 106.845600, 100.00, 3, 'Ruko', 23, '2025-06-18 06:10:42'),
(32, -6.208800, 106.845600, 100.00, 3, 'Ruko', 22, '2025-06-18 06:20:01'),
(33, -6.208800, 106.845600, 100.00, 3, 'Ruko', 20, '2025-06-20 22:20:46'),
(34, -6.208800, 106.845600, 100.00, 3, 'Ruko', 20, '2025-06-23 10:14:53'),
(35, -6.208800, 106.845600, 100.00, 3, 'Ruko', 20, '2025-06-23 10:46:33'),
(36, -6.208800, 106.845600, 100.00, 3, 'Ruko', 20, '2025-06-23 11:00:46'),
(37, -6.208800, 106.845600, 100.00, 3, 'Ruko', 20, '2025-06-23 11:02:22'),
(38, -6.208800, 106.845600, 100.00, 3, 'Ruko', 20, '2025-06-23 11:05:35'),
(39, -6.208800, 106.845600, 100.00, 3, 'Ruko', 20, '2025-06-23 11:09:27'),
(40, -6.208800, 106.845600, 100.00, 3, 'Ruko', 20, '2025-06-28 11:11:54');

-- --------------------------------------------------------

--
-- Table structure for table `location_events`
--

CREATE TABLE `location_events` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `location_id` int(11) NOT NULL,
  `event_type` enum('ENTER','EXIT') NOT NULL,
  `event_timestamp` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `photos`
--

CREATE TABLE `photos` (
  `id_photos` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `photo_url` text NOT NULL,
  `public_id` text NOT NULL,
  `photo_updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `photos`
--

INSERT INTO `photos` (`id_photos`, `user_id`, `photo_url`, `public_id`, `photo_updated_at`) VALUES
(5, 2, 'uploads\\face\\face-1748245969655-859492489.jpg', '', '2025-05-26 07:52:49'),
(6, 3, 'uploads\\face\\face-1748246409017-181078066.jpg', '', '2025-05-26 08:00:09'),
(7, 4, 'uploads\\face\\face-1748248237329-37107794.jpg', '', '2025-05-26 08:30:37'),
(8, 7, 'uploads\\face\\face-1748333090217-344943194.jpg', '', '2025-05-27 08:04:50'),
(9, 8, 'uploads\\face\\face-1748333551027-218673770.jpg', '', '2025-05-27 08:12:31'),
(10, 9, 'uploads\\face\\face-1748345811412-863167318.jpg', '', '2025-05-27 11:36:51'),
(11, 10, 'uploads\\face\\face-1748350865849-90443260.jpg', '', '2025-05-27 13:01:05'),
(12, 11, 'uploads\\face\\face-1748842225018-402004703.jpg', '', '2025-06-02 05:30:25'),
(13, 12, 'uploads/face/face-1748966442987-815286.jpg', '', '2025-06-03 16:00:43'),
(14, 13, 'https://res.cloudinary.com/dfbcj6o7j/image/upload/v1750204929/face_photos/my7kkuajdfnuy8nsayro.jpg', 'face_photos/my7kkuajdfnuy8nsayro', '2025-06-18 00:02:09'),
(15, 14, 'uploads/face/face-1750247555463-829849.jpg', '', '2025-06-18 11:52:35'),
(16, 15, 'uploads/face/face-1750327006873-84545.jpg', '', '2025-06-19 09:56:46'),
(17, 16, 'uploads\\face\\face-1748947564368-192253868.jpg', '', '2025-06-03 10:46:04'),
(18, 17, 'uploads/face/face-1750233067544-979561.jpg', '', '2025-06-18 07:51:07'),
(19, 18, 'https://res.cloudinary.com/dfbcj6o7j/image/upload/v1749129796/face_photos/wyb7z3huq6dqmlsiswtd.png', 'face_photos/wyb7z3huq6dqmlsiswtd', '2025-06-19 13:22:28'),
(20, 19, 'https://res.cloudinary.com/dfbcj6o7j/image/upload/v1749127162/face_photos/abps8etahwbrybka8rl5.jpg', 'face_photos/abps8etahwbrybka8rl5', '2025-06-19 12:38:34'),
(21, 20, 'https://res.cloudinary.com/dfbcj6o7j/image/upload/v1749121889/user_photos/rnqpzaqv2gf3mlfh0b9r.jpg', 'user_photos/rnqpzaqv2gf3mlfh0b9r', '2025-06-19 11:10:41'),
(22, 21, 'https://res.cloudinary.com/dfbcj6o7j/image/upload/v1749126784/face_photos/jxzctvgi1agz5zwoallv.jpg', 'face_photos/jxzctvgi1agz5zwoallv', '2025-06-19 12:32:17'),
(23, 22, 'https://res.cloudinary.com/dfbcj6o7j/image/upload/v1749124323/face_photos/xrj5boa7bjqzk3yzgpsl.jpg', 'face_photos/xrj5boa7bjqzk3yzgpsl', '2025-06-19 11:51:15'),
(24, 23, 'https://res.cloudinary.com/dfbcj6o7j/image/upload/v1749126939/face_photos/imad21vtwvjwp0jfx9p2.jpg', 'face_photos/imad21vtwvjwp0jfx9p2', '2025-06-19 12:34:51'),
(25, 24, 'https://res.cloudinary.com/dfbcj6o7j/image/upload/v1749295836/face_photos/pnemsigisypn2k8sjtxc.png', 'face_photos/pnemsigisypn2k8sjtxc', '2025-06-07 11:30:36');

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
-- Table structure for table `sequelizemeta`
--

CREATE TABLE `sequelizemeta` (
  `name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `sequelizemeta`
--

INSERT INTO `sequelizemeta` (`name`) VALUES
('20240525120000-create-user.cjs');

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text NOT NULL,
  `description` text DEFAULT NULL,
  `updated_at` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`setting_key`, `setting_value`, `description`, `updated_at`) VALUES
('checkin.start_time', '08:00:00', 'ontime', '0000-00-00'),
('checkin.late_time', '10:00:00', 'Late', '0000-00-00'),
('checkout.auto_time', '23:50:00', 'Cek out', '2025-06-09'),
('checkout.flexible', 'true', 'check-out valid', '0000-00-00'),
('checkin.end_time', '22:00:00', 'Waktu paling akhir pengguna bisa melakukan check-in', '0000-00-00'),
('wfa.recommendation.search_radius', '10000', 'Radius pencarian (dalam meter) default untuk fitur rekomendasi lokasi WFA.', '0000-00-00');

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
(8, 'Febriyadi', 'febriyadi055@email.com', '$2b$10$8yfwNHQy5umCQwR/.JlQBeW6qA7ngd9jXIbnvcErbXnT0jg.M8pvm', '08539507795', 'F55121083', 2, 2, 3, NULL, 9, '2025-05-27 08:12:31', '2025-06-02 16:14:50', '2025-06-02 16:14:50', NULL, NULL),
(9, 'Febriyadi', 'febriyadi056@email.com', '$2b$10$8RKX6pMtuoYZNpK7iEJ51uvLulV9ea/ZojF264Iy2gyeStvxKxVGe', '08539507795', 'F55121082cd', 2, 2, 3, NULL, 10, '2025-05-27 11:36:51', '2025-05-27 11:36:51', NULL, NULL, NULL),
(10, 'Febriyadi', 'febriyadi05d6@email.com', '$2b$10$/gtczjfTLkJ2FJw3CRNKeeEDvGhNn8udgi8exGvV9Y95q2J5urChK', '08539507795', 'F55121082cdgg', 2, 2, 3, NULL, 11, '2025-05-27 13:01:05', '2025-05-27 13:01:05', NULL, NULL, NULL),
(11, 'Febriyadi', 'diana123@email.com', '$2b$10$xwIzrjmTz42ubfJHQztCx.oLiFVVGkWj/qmJbFn0WiGqdxvmE2cUW', '08539507795', 'F551210831', 1, 2, 3, NULL, 12, '2025-06-02 05:30:25', '2025-06-02 05:30:25', NULL, NULL, NULL),
(12, 'Diana', '240@email.com', '$2b$10$quGEj6mvakhQnSt.Yl8Y8.t5CCIzoMRrqsJRwe6Ml6skOm2Q.SE7.', '08539507795', 'F551210832', 4, 2, 3, NULL, 13, '2025-06-02 05:36:11', '2025-06-02 05:36:11', NULL, NULL, NULL),
(13, 'John Doe', 'john.doe@example.com', '$2b$10$vfjHV4Wb.pb4keLMDpenxuJCoxFKp1mwn6dZhnMg3w0q5HAV33fC6', '08123456789', '240002', 2, 3, 13, 1, 14, '2025-06-03 00:29:09', '2025-06-17 23:53:02', NULL, 12, NULL),
(14, 'John Doe', 'john.doe12@example.com', '$2b$10$KMeiGlgrafYsic12OI4y7uxPi5.pgVV66PDBaD8TLX4wK8OyNWajW', '08123456789', '240002ff', 1, 2, 5, 3, 15, '2025-06-03 08:47:18', '2025-06-18 11:52:35', NULL, 12, NULL),
(15, 'Febriyadi', 'febriyadi11@gmail.com', '$2b$10$.mm603UNSHmzIz840eWLregVGgQsYYYw26/xdH9XpeII0HlSRbEZW', '085395077795', 'f55121092', 3, 1, 13, 3, 16, '2025-06-03 08:55:11', '2025-06-18 09:26:11', NULL, 12, NULL),
(16, 'Shara bauuu', 'shara@gmail.com', '$2b$10$NKW9XxxxOLxAuGMGTaIq2eCItprNZc95wzFdqY044/CJH3aELiVH.', '05565656565', 'F555555555', 1, 3, 8, 3, 17, '2025-06-03 10:46:04', '2025-06-03 10:46:04', NULL, 12, NULL),
(17, 'Febriyadi', 'shara123@gmail.com', '$2b$10$hTo4wsC2fObax5ywudaOj.TwG3aHNsC8ygiZOLLH0nSCnDObkRGky', '085395077795', 'F551210822222', 2, 2, 8, 3, 18, '2025-06-18 07:49:58', '2025-06-18 07:51:07', NULL, 12, NULL),
(18, 'Diana', 'john.doe2@example.com', '$2b$10$fwanrb4gOxwZ4VRNQaJvQOSO3f8VHGPZYhSHag.hLneV3j6FVTNbO', '08123456789', '240002ff11', 3, 3, 16, 4, 19, '2025-06-19 09:55:33', '2025-06-19 13:22:07', NULL, 12, NULL),
(19, 'Diana', 'john.doe21@example.com', '$2b$10$B5ZMqYueat96docGBpL9cemO5/ZWwbKlLauaYTz0PoCK1XfHJ52NC', '08123456789', '240002ff11111', 3, 1, 2, 4, 20, '2025-06-19 10:54:12', '2025-06-19 13:20:53', NULL, 12, NULL),
(20, 'Diana', '12233@email.com', '$2b$10$jx349Bx8d4WL81rMtTnxDu5GRRTZI89VczZCvruAiYdajsUMmXYIy', '08539507795', 'F55121083212121', 4, 2, 3, NULL, 21, '2025-06-19 11:10:41', '2025-06-19 11:10:41', NULL, NULL, NULL),
(21, 'Diana', 'febriyadi@gmail.com', '$2b$10$HFBq6o306rzjXFddU9GH..sApo412wT665nr5k9JALqTClDiMfRYG', '08539507795', 'F55121083211', 4, 3, 14, 2, 22, '2025-06-19 11:23:26', '2025-06-19 12:31:19', NULL, NULL, NULL),
(22, 'Diana', 'john.doe2122@example.com', '$2b$10$X5afT6.9.X.biSZFWUk1nOD5Xlkl3sAqNhGaOnsLDxAPCpzBbPVUG', '08123456789', '240002ff1111111', 4, 1, 1, 1, 23, '2025-06-19 11:51:15', '2025-06-19 11:51:15', NULL, 21, NULL),
(23, 'Timothy Ronald', 'timothyronald@gmail.com', '$2b$10$gijbalbmUEK/z.vYfWXMKOClEizxzeqjmVzc0dqWOLxwAjHXMICW6', '085395077795', 'F5512062', 3, 3, 15, 4, 24, '2025-06-19 12:34:51', '2025-06-08 02:05:19', NULL, 12, NULL),
(24, 'febriyadi', 'eoeo@gmail.com', '$2b$10$cGeCdZVhK1cHwJzNybVHlejODTHVZHFVOlLTMsMIouxr.aNnB8iwW', '01512551515', 'F55555555555', 4, 3, 11, 4, 25, '2025-06-07 11:30:36', '2025-06-07 11:30:36', NULL, 12, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`id_attendance`),
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
  ADD KEY `fk_bookings_status_booking` (`status`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `booking_status`
--
ALTER TABLE `booking_status`
  ADD PRIMARY KEY (`id_booking_status`);

--
-- Indexes for table `discipline_scores`
--
ALTER TABLE `discipline_scores`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_period_unique` (`user_id`,`period_month`,`period_year`);

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
-- Indexes for table `location_events`
--
ALTER TABLE `location_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `location_id` (`location_id`);

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
-- Indexes for table `sequelizemeta`
--
ALTER TABLE `sequelizemeta`
  ADD PRIMARY KEY (`name`),
  ADD UNIQUE KEY `name` (`name`);

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
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `id_attendance` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

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
  MODIFY `booking_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `booking_status`
--
ALTER TABLE `booking_status`
  MODIFY `id_booking_status` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `discipline_scores`
--
ALTER TABLE `discipline_scores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `divisions`
--
ALTER TABLE `divisions`
  MODIFY `id_divisions` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `locations`
--
ALTER TABLE `locations`
  MODIFY `location_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `location_events`
--
ALTER TABLE `location_events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `photos`
--
ALTER TABLE `photos`
  MODIFY `id_photos` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

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
  MODIFY `id_users` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

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
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id_users`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_bookings_location_id` FOREIGN KEY (`location_id`) REFERENCES `locations` (`location_id`),
  ADD CONSTRAINT `fk_bookings_status_booking` FOREIGN KEY (`status`) REFERENCES `booking_status` (`id_booking_status`),
  ADD CONSTRAINT `fk_bookings_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id_users`);

--
-- Constraints for table `discipline_scores`
--
ALTER TABLE `discipline_scores`
  ADD CONSTRAINT `discipline_scores_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id_users`) ON DELETE CASCADE;

--
-- Constraints for table `locations`
--
ALTER TABLE `locations`
  ADD CONSTRAINT `fk_location_id_attendance_categories` FOREIGN KEY (`id_attendance_categories`) REFERENCES `attendance_categories` (`id_attendance_categories`),
  ADD CONSTRAINT `fk_location_id_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id_users`);

--
-- Constraints for table `location_events`
--
ALTER TABLE `location_events`
  ADD CONSTRAINT `location_events_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id_users`) ON DELETE CASCADE,
  ADD CONSTRAINT `location_events_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `locations` (`location_id`) ON DELETE CASCADE;

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

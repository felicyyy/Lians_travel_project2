-- ================================================================
-- DATABASE: lians_travel
-- PostgreSQL untuk Aplikasi Pemesanan Transportasi Lians Travel
-- ================================================================

-- ===== CREATE DATABASE =====
CREATE DATABASE lians_travel;

\c lians_travel;

-- ===== TABLE: tb_users =====
CREATE TABLE tb_users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    fullname VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- ===== TABLE: tb_vehicles =====
CREATE TABLE tb_vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    vehicle_code VARCHAR(20) UNIQUE NOT NULL,
    vehicle_name VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(50),
    seat_capacity INT NOT NULL,
    price_per_day DECIMAL(15, 2) NOT NULL,
    transmission VARCHAR(20),
    fuel_type VARCHAR(20),
    description TEXT,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== TABLE: tb_bookings =====
CREATE TABLE tb_bookings (
    booking_id SERIAL PRIMARY KEY,
    booking_code VARCHAR(20) UNIQUE NOT NULL,
    fullname VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    vehicle_id INT REFERENCES tb_vehicles(vehicle_id),
    vehicle_name VARCHAR(100),
    vehicle_price_per_day DECIMAL(15, 2),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rental_days INT NOT NULL,
    estimated_total DECIMAL(15, 2) NOT NULL,
    pickup_location TEXT,
    destination TEXT,
    is_outside_city BOOLEAN DEFAULT FALSE,
    additional_charge DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_time TIMESTAMP,
    completed_time TIMESTAMP,
    cancelled_time TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'))
);

-- ===== TABLE: tb_booking_history =====
CREATE TABLE tb_booking_history (
    history_id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES tb_bookings(booking_id),
    action VARCHAR(50) NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== SEED DATA: tb_vehicles =====
INSERT INTO tb_vehicles (vehicle_code, vehicle_name, vehicle_type, seat_capacity, price_per_day, transmission, fuel_type, description) VALUES
('ALP', 'Toyota Alphard', 'Mobil', 7, 800000, 'Matic', 'Bensin', 'Kendaraan mewah 7 seat, cocok untuk perjalanan eksekutif'),
('INN', 'Toyota Innova Zenix', 'Mobil', 7, 500000, 'Matic', 'Bensin', 'Kendaraan keluarga 7 seat, nyaman dan modern'),
('HIA', 'Hiace Commuter', 'Mini Bus', 15, 900000, 'Manual', 'Solar', 'Kendaraan 15 seat, cocok untuk rombongan sedang'),
('ELF', 'Mini Bus Elf', 'Mini Bus', 19, 1200000, 'Manual', 'Solar', 'Kendaraan 19 seat, cocok untuk wisata rombongan'),
('BUS', 'Bus Besar', 'Bus', 40, 2500000, 'Manual', 'Solar', 'Kendaraan 40 seat, cocok untuk acara besar'),
('INN-R', 'Innova Reguler', 'Mobil', 7, 400000, 'Manual', 'Bensin', 'Kendaraan 7 seat, pilihan ekonomis');

-- ===== SEED DATA: tb_users =====
-- Password: admin123 (akan di-hash di aplikasi)
INSERT INTO tb_users (username, password, email, fullname, phone, role) VALUES
('admin', 'admin123', 'admin@lianstravel.com', 'Administrator Lians Travel', '08123456789', 'admin'),
('customer1', 'customer123', 'customer1@mail.com', 'Customer Satu', '08123456780', 'customer');

-- ===== FUNCTION: Generate Booking Code =====
CREATE OR REPLACE FUNCTION generate_booking_code()
RETURNS TRIGGER AS $$
DECLARE
    date_prefix VARCHAR(8);
    next_number INT;
BEGIN
    date_prefix := TO_CHAR(NEW.booking_time, 'YYYYMMDD');
    SELECT COALESCE(MAX(CAST(SUBSTRING(booking_code FROM 13 FOR 3) AS INT)), 0) + 1
    INTO next_number
    FROM tb_bookings
    WHERE booking_code LIKE 'LTR-' || date_prefix || '-%';
    
    NEW.booking_code := 'LTR-' || date_prefix || '-' || LPAD(COALESCE(next_number, 1)::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== TRIGGER: Generate Booking Code =====
CREATE TRIGGER trg_generate_booking_code
BEFORE INSERT ON tb_bookings
FOR EACH ROW
EXECUTE FUNCTION generate_booking_code();

-- ===== FUNCTION: Update Status Timestamp =====
CREATE OR REPLACE FUNCTION update_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NEW.status = 'confirmed' THEN
            NEW.confirmed_time = CURRENT_TIMESTAMP;
        ELSIF NEW.status = 'completed' THEN
            NEW.completed_time = CURRENT_TIMESTAMP;
        ELSIF NEW.status = 'cancelled' THEN
            NEW.cancelled_time = CURRENT_TIMESTAMP;
        END IF;
        
        INSERT INTO tb_booking_history (booking_id, action, old_status, new_status)
        VALUES (NEW.booking_id, 'status_changed', OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== TRIGGER: Update Status Timestamp =====
CREATE TRIGGER trg_bookings_status_timestamp
BEFORE UPDATE ON tb_bookings
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_status_timestamp();

-- ===== VIEW: Booking Details =====
CREATE VIEW vw_booking_details AS
SELECT 
    b.booking_id,
    b.booking_code,
    b.fullname,
    b.email,
    b.phone,
    b.vehicle_name,
    b.vehicle_price_per_day,
    b.start_date,
    b.end_date,
    b.rental_days,
    b.estimated_total,
    b.pickup_location,
    b.destination,
    b.is_outside_city,
    b.additional_charge,
    b.status,
    b.booking_time,
    b.confirmed_time,
    b.completed_time,
    b.notes
FROM tb_bookings b
ORDER BY b.booking_time DESC;

-- ===== VIEW: Monthly Statistics =====
CREATE VIEW vw_monthly_stats AS
SELECT 
    TO_CHAR(booking_time, 'YYYY-MM') AS month,
    COUNT(*) AS total_bookings,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_count,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_count,
    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count,
    SUM(CASE WHEN status IN ('confirmed', 'completed') THEN estimated_total ELSE 0 END) AS revenue
FROM tb_bookings
GROUP BY TO_CHAR(booking_time, 'YYYY-MM')
ORDER BY month DESC;

-- ===== VIEW: Vehicle Popularity =====
CREATE VIEW vw_vehicle_popularity AS
SELECT 
    vehicle_name,
    COUNT(*) AS total_booking,
    SUM(rental_days) AS total_days_rented,
    SUM(estimated_total) AS total_revenue
FROM tb_bookings
WHERE status NOT IN ('cancelled')
GROUP BY vehicle_name
ORDER BY total_booking DESC;

-- ===== QUERY TEST =====
SELECT * FROM vw_booking_details;
SELECT * FROM vw_monthly_stats;
SELECT * FROM vw_vehicle_popularity;
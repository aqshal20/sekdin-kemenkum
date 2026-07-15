CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fullname VARCHAR(255),
    nik VARCHAR(16) UNIQUE,
    phone VARCHAR(20),
    is_verified BOOLEAN DEFAULT FALSE,
    otp_code VARCHAR(6),
    otp_expiry TIMESTAMP,
    role VARCHAR(50) NOT NULL DEFAULT 'participant',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (email, password, role) 
VALUES ('admin@sekdin.go.id', '$2b$10$VTYsh1zHPlcJJhSdAYxPjeKG7rabSpQIMCGKb2D68b91L/qe7Ig6', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password, role) 
VALUES ('admin_info@sekdin.go.id', '$2b$10$VTYsh1zHPlcJJhSdAYxPjeKG7rabSpQIMCGKb2D68b91L/qe7Ig6', 'admin_informasi')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password, role) 
VALUES ('admin_aduan@sekdin.go.id', '$2b$10$VTYsh1zHPlcJJhSdAYxPjeKG7rabSpQIMCGKb2D68b91L/qe7Ig6', 'admin_pengaduan')
ON CONFLICT (email) DO NOTHING;

CREATE TABLE IF NOT EXISTS pengaduan (
    id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(50) UNIQUE,
    participant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    service_type VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(20) DEFAULT 'Sedang',
    status VARCHAR(50) DEFAULT 'Menunggu Respon',
    rating INTEGER,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lampiran (
    id SERIAL PRIMARY KEY,
    pengaduan_id INTEGER REFERENCES pengaduan(id) ON DELETE CASCADE,
    file_path VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    pengaduan_id INTEGER REFERENCES pengaduan(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    attachment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    image_path VARCHAR(255),
    attachment_path VARCHAR(255),
    attachment_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO announcements (title, category, content) 
SELECT 'Jadwal layanan administrasi semester genap', 'Informasi Publik', 'Layanan administrasi dibuka setiap Senin-Jumat dengan jadwal pelayanan terbarui. Silakan cek rincian layanan di unit terkait.'
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title = 'Jadwal layanan administrasi semester genap');

INSERT INTO announcements (title, category, content) 
SELECT 'Sosialisasi sistem pengaduan terintegrasi', 'Agenda', 'Kegiatan sosialisasi dilakukan secara daring untuk seluruh civitas akademika. Tautan dan jadwal akan disampaikan melalui email resmi.'
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title = 'Sosialisasi sistem pengaduan terintegrasi');

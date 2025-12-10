-- MailSkrap Database Schema
-- Run these queries in your MySQL database (phpMyAdmin / CLI)

-- Create database (if not exists)
CREATE DATABASE IF NOT EXISTS mailskrap_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mailskrap_db;

-- =====================================
-- USERS TABLE
-- =====================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    city VARCHAR(255),
    country VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_otp VARCHAR(6),
    otp_expires_at DATETIME,
    profile_picture VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_verification (email, verification_otp, otp_expires_at)
);

-- =====================================
-- EMAIL TEMPLATES TABLE
-- =====================================
CREATE TABLE email_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    content TEXT,
    template_type ENUM('marketing', 'transactional', 'newsletter', 'followup') DEFAULT 'marketing',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_templates (user_id),
    INDEX idx_template_type (template_type)
);

-- =====================================
-- EMAIL CAMPAIGNS TABLE
-- =====================================
CREATE TABLE email_campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    content TEXT,
    template_id INT,
    status ENUM('draft', 'scheduled', 'sending', 'sent', 'paused') DEFAULT 'draft',
    scheduled_at DATETIME,
    sent_at DATETIME,
    total_recipients INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    opened_count INT DEFAULT 0,
    clicked_count INT DEFAULT 0,
    bounced_count INT DEFAULT 0,
    -- Follow-up campaign settings
    has_followup BOOLEAN DEFAULT FALSE,
    followup_template_id INT,
    followup_subject VARCHAR(500),
    followup_delay_hours INT DEFAULT 24,
    followup_condition ENUM('not_opened', 'not_clicked', 'always') DEFAULT 'not_opened',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (followup_template_id) REFERENCES email_templates(id) ON DELETE SET NULL,
    INDEX idx_user_campaigns (user_id),
    INDEX idx_status (status),
    INDEX idx_scheduled (scheduled_at),
    INDEX idx_followup (has_followup, followup_condition)
);

-- =====================================
-- CONTACTS / LEADS TABLE
-- =====================================
CREATE TABLE contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    company VARCHAR(255),
    phone VARCHAR(50),
    country VARCHAR(100),
    city VARCHAR(100),
    status ENUM('active', 'unsubscribed', 'bounced', 'spam') DEFAULT 'active',
    tags TEXT, -- JSON array of tags
    custom_fields JSON,
    source VARCHAR(255),
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_email (user_id, email),
    INDEX idx_user_contacts (user_id),
    INDEX idx_email (email),
    INDEX idx_status (status)
);

-- =====================================
-- EMAIL LOGS TABLE
-- =====================================
CREATE TABLE email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT,
    contact_id INT NOT NULL,
    user_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    status ENUM('sent', 'delivered', 'opened', 'clicked', 'bounced', 'spam', 'failed') NOT NULL,
    provider_message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP NULL,
    opened_at TIMESTAMP NULL,
    clicked_at TIMESTAMP NULL,
    is_followup BOOLEAN DEFAULT FALSE,
    original_campaign_id INT,
    followup_sent_at TIMESTAMP NULL,
    FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (original_campaign_id) REFERENCES email_campaigns(id) ON DELETE SET NULL,
    INDEX idx_campaign_logs (campaign_id),
    INDEX idx_contact_logs (contact_id),
    INDEX idx_user_logs (user_id),
    INDEX idx_status (status),
    INDEX idx_sent_at (sent_at),
    INDEX idx_followup (is_followup, original_campaign_id)
);

-- =====================================
-- EMAIL TRACKING TABLE
-- =====================================
CREATE TABLE email_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    log_id INT NOT NULL,
    event_type ENUM('open', 'click', 'unsubscribe', 'spam') NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    location VARCHAR(255),
    clicked_url VARCHAR(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (log_id) REFERENCES email_logs(id) ON DELETE CASCADE,
    INDEX idx_log_tracking (log_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
);

-- =====================================
-- FOLLOW-UP QUEUE TABLE
-- =====================================
CREATE TABLE followup_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    contact_id INT NOT NULL,
    email_log_id INT NOT NULL,
    user_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    followup_template_id INT NOT NULL,
    followup_subject VARCHAR(500),
    scheduled_at DATETIME NOT NULL,
    status ENUM('pending', 'sent', 'cancelled', 'failed') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (email_log_id) REFERENCES email_logs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (followup_template_id) REFERENCES email_templates(id) ON DELETE CASCADE,
    INDEX idx_campaign_queue (campaign_id),
    INDEX idx_scheduled (scheduled_at),
    INDEX idx_status (status),
    INDEX idx_user_queue (user_id)
);

-- =====================================
-- USER SESSIONS TABLE
-- =====================================
CREATE TABLE user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token_hash),
    INDEX idx_user_token (user_id, token_hash)
);

-- =====================================
-- SYSTEM SETTINGS TABLE
-- =====================================
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    setting_key VARCHAR(255) NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_setting (user_id, setting_key),
    INDEX idx_user_settings (user_id)
);

-- =====================================
-- DEFAULT EMAIL TEMPLATES
-- =====================================
-- =====================================
-- DEFAULT EMAIL TEMPLATES
-- =====================================

INSERT INTO email_templates (
    user_id,
    name,
    subject,
    content,
    template_type,
    is_default
) VALUES
(1, 'Welcome Email', 'Welcome to MailSkrap!',
'<h1>Welcome to MailSkrap!</h1>
<p>Thank you for joining us. We are excited to help you with your email marketing journey.</p>',
'marketing', TRUE),

(1, 'Newsletter Template', 'Monthly Newsletter',
'<h2>Monthly Newsletter</h2>
<p>Here are the latest updates and news from our team.</p>',
'newsletter', TRUE),

(1, 'Promotional Email', 'Special Offer Just for You!',
'<h1>Special Offer</h1>
<p>Do not miss out on this exclusive deal. Limited time only!</p>',
'marketing', TRUE),

(1, 'Follow-up Email', 'Did you see our previous email?',
'<h2>Following up on our previous email</h2>
<p>Hi {FirstName},</p>
<p>I wanted to follow up on the email I sent you earlier. I hope you found it helpful!</p>
<p>If you have any questions or would like to learn more, please don\'t hesitate to reach out.</p>
<p>Best regards,<br>The MailSkrap Team</p>',
'followup', TRUE);


-- =====================================
-- ADDITIONAL INDEXES
-- =====================================
CREATE INDEX idx_users_email_verified ON users(email, is_verified);
CREATE INDEX idx_campaigns_user_status ON email_campaigns(user_id, status);
CREATE INDEX idx_contacts_user_status ON contacts(user_id, status);
CREATE INDEX idx_logs_campaign_status ON email_logs(campaign_id, status);
CREATE INDEX idx_followup_queue_scheduled_status ON followup_queue(scheduled_at, status);

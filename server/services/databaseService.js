const mysql = require('mysql2/promise');

class DatabaseService {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  // Initialize database connection
  async initialize() {
    try {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'mailskrap_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      // Test connection
      await this.pool.getConnection();
      this.isConnected = true;
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      this.isConnected = false;
    }
  }

  // Get database connection
  async getConnection() {
    if (!this.isConnected) {
      await this.initialize();
    }
    return this.pool.getConnection();
  }

  // Track email open
  async trackEmailOpen(logId, ipAddress, userAgent) {
    try {
      const connection = await this.getConnection();
      
      // Update email_logs table
      await connection.execute(
        'UPDATE email_logs SET status = ?, opened_at = NOW() WHERE id = ?',
        ['opened', logId]
      );

      // Insert tracking event
      await connection.execute(
        'INSERT INTO email_tracking (log_id, event_type, ip_address, user_agent) VALUES (?, ?, ?, ?)',
        [logId, 'open', ipAddress, userAgent]
      );

      connection.release();
      console.log(`📧 Email opened tracked: ${logId}`);
      return true;
    } catch (error) {
      console.error('Error tracking email open:', error);
      return false;
    }
  }

  // Track email click
  async trackEmailClick(logId, clickedUrl, ipAddress, userAgent) {
    try {
      const connection = await this.getConnection();
      
      // Update email_logs table
      await connection.execute(
        'UPDATE email_logs SET status = ?, clicked_at = NOW() WHERE id = ?',
        ['clicked', logId]
      );

      // Insert tracking event
      await connection.execute(
        'INSERT INTO email_tracking (log_id, event_type, ip_address, user_agent, clicked_url) VALUES (?, ?, ?, ?, ?)',
        [logId, 'click', ipAddress, userAgent, clickedUrl]
      );

      connection.release();
      console.log(`🔗 Email clicked tracked: ${logId}`);
      return true;
    } catch (error) {
      console.error('Error tracking email click:', error);
      return false;
    }
  }

  // Check if email was opened
  async checkEmailOpened(emailLogId) {
    try {
      const connection = await this.getConnection();
      const [rows] = await connection.execute(
        'SELECT opened_at FROM email_logs WHERE id = ? AND opened_at IS NOT NULL',
        [emailLogId]
      );
      connection.release();
      return rows.length > 0;
    } catch (error) {
      console.error('Error checking email opened:', error);
      return false;
    }
  }

  // Check if email was clicked
  async checkEmailClicked(emailLogId) {
    try {
      const connection = await this.getConnection();
      const [rows] = await connection.execute(
        'SELECT clicked_at FROM email_logs WHERE id = ? AND clicked_at IS NOT NULL',
        [emailLogId]
      );
      connection.release();
      return rows.length > 0;
    } catch (error) {
      console.error('Error checking email clicked:', error);
      return false;
    }
  }

  // Get pending follow-ups
  async getPendingFollowups() {
    try {
      const connection = await this.getConnection();
      const [rows] = await connection.execute(`
        SELECT 
          fq.*,
          et.content as template_content
        FROM followup_queue fq
        JOIN email_templates et ON fq.followup_template_id = et.id
        WHERE fq.status = 'pending' 
        AND fq.scheduled_at <= NOW()
        ORDER BY fq.scheduled_at ASC
      `);
      connection.release();
      return rows;
    } catch (error) {
      console.error('Error getting pending follow-ups:', error);
      return [];
    }
  }

  // Update follow-up status
  async updateFollowupStatus(followupId, status, errorMessage = null) {
    try {
      const connection = await this.getConnection();
      await connection.execute(
        'UPDATE followup_queue SET status = ?, sent_at = CASE WHEN ? = "sent" THEN NOW() ELSE NULL END, error_message = ? WHERE id = ?',
        [status, status, errorMessage, followupId]
      );
      connection.release();
      console.log(`📝 Updated follow-up ${followupId} status to ${status}`);
      return true;
    } catch (error) {
      console.error('Error updating follow-up status:', error);
      return false;
    }
  }

  // Schedule follow-up email
  async scheduleFollowup(followupData) {
    try {
      const connection = await this.getConnection();
      const {
        campaignId,
        contactId,
        emailLogId,
        userId,
        email,
        followupTemplateId,
        followupSubject,
        delayHours,
        condition
      } = followupData;

      // Calculate scheduled time
      const scheduledAt = new Date();
      scheduledAt.setHours(scheduledAt.getHours() + delayHours);

      const [result] = await connection.execute(
        `INSERT INTO followup_queue (
          campaign_id, contact_id, email_log_id, user_id, email,
          followup_template_id, followup_subject, scheduled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [campaignId, contactId, emailLogId, userId, email, followupTemplateId, followupSubject, scheduledAt]
      );

      connection.release();
      console.log(`📅 Scheduled follow-up email for ${email} at ${scheduledAt.toISOString()}`);
      return {
        success: true,
        id: result.insertId,
        scheduledAt: scheduledAt.toISOString()
      };
    } catch (error) {
      console.error('Error scheduling follow-up:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get follow-up statistics
  async getFollowupStats(campaignId) {
    try {
      const connection = await this.getConnection();
      const [rows] = await connection.execute(`
        SELECT 
          COUNT(*) as total_scheduled,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as total_sent,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as total_cancelled,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as total_failed
        FROM followup_queue 
        WHERE campaign_id = ?
      `, [campaignId]);
      connection.release();
      
      return {
        totalScheduled: rows[0].total_scheduled || 0,
        totalSent: rows[0].total_sent || 0,
        totalCancelled: rows[0].total_cancelled || 0,
        totalFailed: rows[0].total_failed || 0
      };
    } catch (error) {
      console.error('Error getting follow-up stats:', error);
      return {
        totalScheduled: 0,
        totalSent: 0,
        totalCancelled: 0,
        totalFailed: 0
      };
    }
  }

  // Close database connection
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('🔌 Database connection closed');
    }
  }
}

module.exports = new DatabaseService();

// D:\xampp\htdocs\product_email\server\routes\lead.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

// Configure multer for file upload
const upload = multer({ dest: 'uploads/' });

// Get all leads with filters and search
router.get('/leads', async (req, res) => {
  try {
    const { status, engagement, search } = req.query;
    
    let query = `
      SELECT 
        l.*,
        GROUP_CONCAT(lt.tag) as tags
      FROM leads l
      LEFT JOIN lead_tags lt ON l.id = lt.lead_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status && status !== 'all') {
      query += ' AND l.status = ?';
      params.push(status);
    }
    
    if (engagement && engagement !== 'all') {
      query += ' AND l.engagement = ?';
      params.push(engagement);
    }
    
    if (search) {
      query += ' AND (l.email LIKE ? OR l.name LIKE ? OR l.company LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' GROUP BY l.id ORDER BY l.created_at DESC';
    
    const [leads] = await pool.query(query, params);
    
    // Format tags as array
    const formattedLeads = leads.map(lead => ({
      ...lead,
      tags: lead.tags ? lead.tags.split(',') : []
    }));
    
    res.json({
      success: true,
      data: formattedLeads
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leads',
      error: error.message
    });
  }
});

// Get lead statistics
router.get('/leads/stats', async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_leads,
        SUM(CASE WHEN status = 'Hot Lead' THEN 1 ELSE 0 END) as hot_leads,
        SUM(CASE WHEN status = 'Replied' THEN 1 ELSE 0 END) as replied,
        ROUND(AVG(score)) as avg_score
      FROM leads
    `);
    
    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// Get funnel data
router.get('/leads/funnel', async (req, res) => {
  try {
    const [funnel] = await pool.query(`
      SELECT 
        COUNT(*) as total_leads,
        SUM(CASE WHEN engagement IN ('High', 'Medium') THEN 1 ELSE 0 END) as engaged,
        SUM(CASE WHEN status IN ('Hot Lead', 'Replied') THEN 1 ELSE 0 END) as qualified,
        SUM(CASE WHEN status = 'Replied' AND score >= 70 THEN 1 ELSE 0 END) as converted
      FROM leads
    `);
    
    res.json({
      success: true,
      data: funnel[0]
    });
  } catch (error) {
    console.error('Error fetching funnel data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching funnel data',
      error: error.message
    });
  }
});

// Get single lead by ID
router.get('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [leads] = await pool.query(
      `SELECT l.*, GROUP_CONCAT(lt.tag) as tags
       FROM leads l
       LEFT JOIN lead_tags lt ON l.id = lt.lead_id
       WHERE l.id = ?
       GROUP BY l.id`,
      [id]
    );
    
    if (leads.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }
    
    const lead = {
      ...leads[0],
      tags: leads[0].tags ? leads[0].tags.split(',') : []
    };
    
    res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lead',
      error: error.message
    });
  }
});

// Add new lead
router.post('/leads', async (req, res) => {
  try {
    const { email, name, company, status, score, engagement, tags } = req.body;
    
    // Validate required fields
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email and name are required'
      });
    }
    
    // Check if email already exists
    const [existingLead] = await pool.query(
      'SELECT id FROM leads WHERE email = ?',
      [email]
    );
    
    if (existingLead.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Lead with this email already exists'
      });
    }
    
    // Insert lead
    const [result] = await pool.query(
      `INSERT INTO leads (email, name, company, added_date, status, score, engagement) 
       VALUES (?, ?, ?, CURDATE(), ?, ?, ?)`,
      [
        email, 
        name, 
        company || null, 
        status || 'New', 
        score || 0, 
        engagement || 'None'
      ]
    );
    
    const leadId = result.insertId;
    
    // Insert tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const tagValues = tags.map(tag => [leadId, tag]);
      await pool.query(
        'INSERT INTO lead_tags (lead_id, tag) VALUES ?',
        [tagValues]
      );
    }
    
    // Fetch the created lead
    const [newLead] = await pool.query(
      `SELECT l.*, GROUP_CONCAT(lt.tag) as tags
       FROM leads l
       LEFT JOIN lead_tags lt ON l.id = lt.lead_id
       WHERE l.id = ?
       GROUP BY l.id`,
      [leadId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: {
        ...newLead[0],
        tags: newLead[0].tags ? newLead[0].tags.split(',') : []
      }
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating lead',
      error: error.message
    });
  }
});

// Update lead
router.put('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, company, status, score, engagement, tags } = req.body;
    
    // Check if lead exists
    const [existingLead] = await pool.query(
      'SELECT id FROM leads WHERE id = ?',
      [id]
    );
    
    if (existingLead.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }
    
    // Check if email is being changed and if it already exists
    if (email) {
      const [emailCheck] = await pool.query(
        'SELECT id FROM leads WHERE email = ? AND id != ?',
        [email, id]
      );
      
      if (emailCheck.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists for another lead'
        });
      }
    }
    
    // Update lead
    await pool.query(
      `UPDATE leads 
       SET email = ?, name = ?, company = ?, status = ?, score = ?, engagement = ?
       WHERE id = ?`,
      [email, name, company, status, score, engagement, id]
    );
    
    // Update tags
    if (tags !== undefined && Array.isArray(tags)) {
      // Delete existing tags
      await pool.query('DELETE FROM lead_tags WHERE lead_id = ?', [id]);
      
      // Insert new tags
      if (tags.length > 0) {
        const tagValues = tags.map(tag => [id, tag]);
        await pool.query(
          'INSERT INTO lead_tags (lead_id, tag) VALUES ?',
          [tagValues]
        );
      }
    }
    
    // Fetch updated lead
    const [updatedLead] = await pool.query(
      `SELECT l.*, GROUP_CONCAT(lt.tag) as tags
       FROM leads l
       LEFT JOIN lead_tags lt ON l.id = lt.lead_id
       WHERE l.id = ?
       GROUP BY l.id`,
      [id]
    );
    
    res.json({
      success: true,
      message: 'Lead updated successfully',
      data: {
        ...updatedLead[0],
        tags: updatedLead[0].tags ? updatedLead[0].tags.split(',') : []
      }
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating lead',
      error: error.message
    });
  }
});

// Delete lead
router.delete('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if lead exists
    const [existingLead] = await pool.query(
      'SELECT id FROM leads WHERE id = ?',
      [id]
    );
    
    if (existingLead.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }
    
    // Delete lead (tags will be deleted automatically due to CASCADE)
    await pool.query('DELETE FROM leads WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting lead',
      error: error.message
    });
  }
});

// Delete multiple leads
router.post('/leads/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lead IDs provided'
      });
    }
    
    const placeholders = ids.map(() => '?').join(',');
    await pool.query(
      `DELETE FROM leads WHERE id IN (${placeholders})`,
      ids
    );
    
    res.json({
      success: true,
      message: `${ids.length} lead(s) deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting leads:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting leads',
      error: error.message
    });
  }
});

// Add tag to multiple leads
router.post('/leads/bulk-tag', async (req, res) => {
  try {
    const { leadIds, tags } = req.body;
    
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lead IDs provided'
      });
    }
    
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tags provided'
      });
    }
    
    // Prepare bulk insert values
    const tagValues = [];
    leadIds.forEach(leadId => {
      tags.forEach(tag => {
        tagValues.push([leadId, tag]);
      });
    });
    
    // Insert tags (ignore duplicates)
    await pool.query(
      'INSERT IGNORE INTO lead_tags (lead_id, tag) VALUES ?',
      [tagValues]
    );
    
    res.json({
      success: true,
      message: `Tags added to ${leadIds.length} lead(s) successfully`
    });
  } catch (error) {
    console.error('Error adding tags:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding tags',
      error: error.message
    });
  }
});

// Import leads from CSV
router.post('/leads/import', upload.single('file'), async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    filePath = req.file.path;
    const leads = [];
    let imported = 0;
    let skipped = 0;
    const errors = [];

    // Read and parse CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          leads.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Process each lead
    for (const [index, leadData] of leads.entries()) {
      try {
        const email = leadData.Email?.trim();
        const name = leadData.Name?.trim();
        const company = leadData.Company?.trim() || null;
        const status = leadData.Status?.trim() || 'New';
        const score = parseInt(leadData.Score) || 0;
        const engagement = leadData.Engagement?.trim() || 'None';
        const tagsStr = leadData.Tags?.trim() || '';

        // Validate required fields
        if (!email || !name) {
          errors.push(`Row ${index + 2}: Email and Name are required`);
          skipped++;
          continue;
        }

        // Check if email already exists
        const [existingLead] = await pool.query(
          'SELECT id FROM leads WHERE email = ?',
          [email]
        );

        if (existingLead.length > 0) {
          errors.push(`Row ${index + 2}: Email ${email} already exists`);
          skipped++;
          continue;
        }

        // Insert lead
        const [result] = await pool.query(
          `INSERT INTO leads (email, name, company, added_date, status, score, engagement) 
           VALUES (?, ?, ?, CURDATE(), ?, ?, ?)`,
          [email, name, company, status, score, engagement]
        );

        const leadId = result.insertId;

        // Insert tags if provided
        if (tagsStr) {
          const tags = tagsStr.split(';').map(tag => tag.trim()).filter(tag => tag);
          if (tags.length > 0) {
            const tagValues = tags.map(tag => [leadId, tag]);
            await pool.query(
              'INSERT INTO lead_tags (lead_id, tag) VALUES ?',
              [tagValues]
            );
          }
        }

        imported++;
      } catch (error) {
        console.error(`Error processing row ${index + 2}:`, error);
        errors.push(`Row ${index + 2}: ${error.message}`);
        skipped++;
      }
    }

    // Clean up uploaded file
    if (filePath) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: `Import completed. ${imported} leads imported, ${skipped} skipped`,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error importing CSV:', error);
    
    // Clean up uploaded file on error
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error importing CSV',
      error: error.message
    });
  }
});

module.exports = router;
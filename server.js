// server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // serve index.html

// === ភ្ជាប់ Neon Postgres ត្រឹមត្រូវបំផុត ===
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // មិនចាំបាច់បន្ថែម ssl ទេ ព្រោះ ?sslmode=require មានរួចហើយ
});

// Test connection (សម្រាប់ debug)
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ មិនអាចភ្ជាប់ Neon Postgres បានទេ:', err.stack);
    return;
  }
  console.log('✅ ភ្ជាប់ទៅ Neon Postgres ជោគជ័យ!');
  release();
});

// API: Get all registry
app.get('/api/registry', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registry ORDER BY timestamp DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Query error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// API: Add new registry entry
app.post('/api/registry', async (req, res) => {
    try {
      const data = req.body;
      console.log('Received data:', data);
  
      const fields = [
        'siteName', 'partner', 'registerDate', 'expireDate', 'requestSubscript',
        'user', 'password', 'ipPublic', 'gateway', 'ipPrivate', 'entryId',
        'speed', 'wirelessSsid', 'wirelessPass', 'userDevice', 'pasDevices', 'hotline'
      ];
  
      const values = fields.map(f => data[f] || null);
      const placeholders = fields.map((_, i) => `$${i+2}`).join(',');
  
      const queryText = `
        INSERT INTO registry (
          timestamp,
          "siteName", partner, "registerDate", "expireDate",
          "requestSubscript", "user", password, "ipPublic", gateway,
          "ipPrivate", "entryId", speed, "wirelessSsid", "wirelessPass",
          "userDevice", "pasDevices", hotline
        ) VALUES (
          $1, ${placeholders}
        ) RETURNING *;
      `;
  
      const params = [Date.now(), ...values];
      const result = await pool.query(queryText, params);
  
      // បន្ទាប់ពី insert ជោគជ័យ → ចូល check ភ្លាមៗសម្រាប់ record ថ្មីនេះ
      const newItem = result.rows[0];
  
      if (newItem.expireDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expDate = new Date(newItem.expireDate);
        expDate.setHours(0, 0, 0, 0);
  
        const daysLeft = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
  
        if (daysLeft <= 14) {
          let emoji = daysLeft <= 0 ? '🔥' : (daysLeft <= 7 ? '‼️' : '⚠️');
          let status = daysLeft <= 0 ? 'ផុតកំណត់ហើយ' : `នៅសល់ ${daysLeft} ថ្ងៃ`;
  
          const message = `${emoji} កំណត់ត្រាថ្មីបានបញ្ចូលហើយ!\n` +
                          `ទីតាំង៖ ${newItem.siteName || 'N/A'}\n` +
                          `ក្រុមហ៊ុន៖ ${newItem.partner || '-'}\n` +
                          `System ID៖ ${newItem.entryId || '-'}\n` +
                          `ស្ថានភាព៖ ${status}\n` +
                          `ផុតកំណត់៖ ${expDate.toLocaleDateString('km-KH')}\n` +
                          (newItem.hotline ? `Hotline៖ ${newItem.hotline}\n` : '') +
                          `\nបញ្ចូលនៅ ${new Date().toLocaleString('km-KH')}`;
  
          // ផ្ញើទៅ Telegram ភ្លាមៗ
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN || 'YOUR_TOKEN_HERE'}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: process.env.TELEGRAM_CHAT_ID || '-1003318155720',
              text: message,
              parse_mode: 'HTML'
            })
          });
  
          console.log('Immediate Telegram alert sent for new entry');
        }
      }
  
      res.json({ success: true });
    } catch (err) {
      console.error('INSERT ERROR:', err);
      res.status(500).json({ error: 'Database insert error', details: err.message });
    }
  });

// API: Delete single entry
app.delete('/api/registry/:timestamp', async (req, res) => {
  try {
    const { timestamp } = req.params;
    await pool.query('DELETE FROM registry WHERE timestamp = $1', [timestamp]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// API: Delete all
app.delete('/api/registry', async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE registry RESTART IDENTITY CASCADE');
    res.json({ success: true });
  } catch (err) {
    console.error('Clear error:', err);
    res.status(500).json({ error: 'Clear failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
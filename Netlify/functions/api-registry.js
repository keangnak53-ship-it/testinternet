const { Pool } = require('pg');

exports.handler = async (event, context) => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // GET: ទាញទិន្នន័យទាំងអស់
    if (event.httpMethod === 'GET') {
      const res = await pool.query('SELECT * FROM registry ORDER BY timestamp DESC');
      console.log('GET success - rows found:', res.rows.length);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(res.rows)
      };
    }

    // POST: បញ្ចូល record ថ្មី
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      console.log('POST received:', data);

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

      console.log('POST insert success');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true })
      };
    }

    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  } catch (err) {
    console.error('API error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  } finally {
    await pool.end();
  }
};
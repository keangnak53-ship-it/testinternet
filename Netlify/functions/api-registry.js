const { Pool } = require('pg');

exports.handler = async (event, context) => {
  console.log('Function invoked with method:', event.httpMethod);

  const pool = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL_UNPOOLED,
  });

  try {
    if (event.httpMethod === 'GET') {
      console.log('GET request - fetching registry data');
      const res = await pool.query('SELECT * FROM registry ORDER BY timestamp DESC');
      console.log('GET success - found rows:', res.rows.length);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(res.rows)
      };
    }

    if (event.httpMethod === 'POST') {
      console.log('POST request - inserting new record');
      const data = JSON.parse(event.body);
      console.log('POST data:', data);

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

      console.log('POST insert success - new timestamp:', result.rows[0].timestamp);
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
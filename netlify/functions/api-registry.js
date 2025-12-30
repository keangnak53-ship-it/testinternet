import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL, { fullResults: true });

exports.handler = async (event, context) => {
  try {
    if (event.httpMethod === 'GET') {
      console.log('GET: Fetching registry data');
      const rows = await sql`SELECT * FROM registry ORDER BY timestamp DESC`;
      console.log('GET success - found rows:', rows.length);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows)
      };
    }

    if (event.httpMethod === 'POST') {
      console.log('POST: Inserting new entry');
      const data = JSON.parse(event.body || '{}');

      const fields = [
        'siteName', 'partner', 'registerDate', 'expireDate', 'requestSubscript',
        'ipPublic', 'gateway', 'ipPrivate', 'speed', 'wirelessSsid', 'wirelessPass',
        'user', 'password', 'entryId', 'hotline'
      ];

      const values = fields.map(f => data[f] ?? null);

      await sql`
        INSERT INTO registry (${sql(fields)})
        VALUES (${sql(values)})
      `;

      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Entry added' })
      };
    }

    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  } catch (error) {
    console.error('API error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL, { fullResults: true });

exports.handler = async (event, context) => {
  try {
    if (event.httpMethod === 'GET') {
      console.log('GET: Fetching registry data');
    
      const result = await sql`
        SELECT * FROM registry
        ORDER BY timestamp DESC
      `;
    
      console.log('GET success - found rows:', result.rows.length);
    
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(result.rows) // ✅ ONLY rows
      };
    }

    // if (event.httpMethod === 'POST') {
    //   console.log('POST: Inserting new entry');
    //   const data = JSON.parse(event.body || '{}');

    //   const fields = [
    //     'siteName', 'partner', 'registerDate', 'expireDate', 'requestSubscript',
    //     'ipPublic', 'gateway', 'ipPrivate', 'speed', 'wirelessSsid', 'wirelessPass',
    //     'user', 'password', 'entryId', 'hotline'
    //   ];

    //   const values = fields.map(f => data[f] ?? null);

    //   await sql`
    //     INSERT INTO registry (${sql(fields)})
    //     VALUES (${sql(values)})
    //   `;

    //   return {
    //     statusCode: 201,
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ message: 'Entry added' })
    //   };
    // }

    if (event.httpMethod === 'POST') {
      try {
        let data;
        try {
          data = JSON.parse(event.body);
        } catch (e) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
        }
    
        // Required fields validation
        if (!data.registerDate || !data.entryId) {
          return { statusCode: 400, body: JSON.stringify({ error: 'registerDate and entryId required' }) };
        }
    
        await sql`
          INSERT INTO registry (
            "registerDate", "expireDate", "requestSubscript", "user", "password",
            "ipPublic", "gateway", "ipPrivate", "entryId", "speed",
            "wirelessSsid", "wirelessPass", "userDevice", "pasDevices", "hotline",
            "siteName", "partner"
          ) VALUES (
            ${data.registerDate}, ${data.expireDate}, ${data.requestSubscript}, ${data.user}, ${data.password},
            ${data.ipPublic}, ${data.gateway}, ${data.ipPrivate}, ${data.entryId}, ${data.speed},
            ${data.wirelessSsid}, ${data.wirelessPass}, ${data.userDevice}, ${data.pasDevices}, ${data.hotline},
            ${data.siteName}, ${data.partner}
          )
        `;
    
        return { statusCode: 201, body: JSON.stringify({ message: 'Entry added successfully' }) };
      } catch (error) {
        console.error('POST error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Insert failed', detail: error.message }) };
      }
    }
    
    
    
    
    
    if (event.httpMethod === "DELETE") {
      const id = event.queryStringParameters?.id;
    
      if (!id) {
        return { statusCode: 400, body: "Missing id" };
      }
    
      await sql`DELETE FROM registry WHERE timestamp = ${id}`;
    
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Deleted" })
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
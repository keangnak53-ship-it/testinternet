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
        console.log('POST: Inserting new entry');

        // Parse JSON safely
        let data;
        try {
          data = JSON.parse(event.body);
        } catch (e) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
        }

        // Validate required fields (if needed)
        if (!data.entryId) {
          return { statusCode: 400, body: JSON.stringify({ error: 'entryId is required' }) };
        }

        // Validate registerDate and expireDate
        const parseDate = (d) => {
          if (!d) return null;
          const date = new Date(d);
          return isNaN(date) ? null : date.toISOString().split('T')[0]; // YYYY-MM-DD
        };

        const ts = Date.now(); // generate timestamp for PRIMARY KEY

        await sql`
          INSERT INTO registry (
            timestamp, siteName, partner, registerDate, expireDate, requestSubscript,
            user, password, ipPublic, gateway, ipPrivate, entryId,
            speed, wirelessSsid, wirelessPass, userDevice, pasDevices, hotline
          ) VALUES (
            ${ts},
            ${data.siteName ?? null},
            ${data.partner ?? null},
            ${parseDate(data.registerDate)},
            ${parseDate(data.expireDate)},
            ${data.requestSubscript ?? null},
            ${data.user ?? null},
            ${data.password ?? null},
            ${data.ipPublic ?? null},
            ${data.gateway ?? null},
            ${data.ipPrivate ?? null},
            ${data.entryId},
            ${data.speed ?? null},
            ${data.wirelessSsid ?? null},
            ${data.wirelessPass ?? null},
            ${data.userDevice ?? null},
            ${data.pasDevices ?? null},
            ${data.hotline ?? null}
          )
        `;

        return {
          statusCode: 201,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ message: 'Entry added successfully', timestamp: ts })
        };
      } catch (error) {
        console.error('POST error:', error.message);
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'Insert failed', detail: error.message })
        };
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
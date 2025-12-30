const { Pool } = require('pg');

exports.handler = async function (event, context) {
  const pool = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL_UNPOOLED,
  });

  try {
    // ១. ទាញទិន្នន័យទាំងអស់ពី registry
    const res = await pool.query('SELECT * FROM registry');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ២. ពិនិត្យថ្ងៃចុងក្រោយដែលផ្ញើសារ (ប្រើ table ឬ variable សាមញ្ញ)
    let lastSent = null;
    try {
      const lastSentRes = await pool.query(
        'SELECT value FROM settings WHERE key = $1',
        ['last_telegram_alert_date']
      );
      if (lastSentRes.rows.length > 0) {
        lastSent = new Date(lastSentRes.rows[0].value);
      }
    } catch (e) {
      // បើ table settings មិនទាន់មាន បង្កើតវា
      await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `);
    }

    // បន្ថែមនៅក្នុង try block ខាងលើ (សាកម្តង)
await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: 'សាកសារ test ពី Netlify Function ដោយដៃ! ថ្ងៃនេះដំណើរការ។',
      parse_mode: 'HTML'
    })
  });
  console.log('Test message sent');

    // បើថ្ងៃនេះផ្ញើរួចហើយ → ឈប់ (កុំផ្ញើទៀតក្នុងថ្ងៃតែមួយ)
    if (lastSent && lastSent.toDateString() === today.toDateString()) {
      console.log('Already sent today, skipping');
      return { statusCode: 200, body: 'Already sent today' };
    }

    const alerts = [];
    const criticalAlerts = []; // សម្រាប់ផុតកំណត់ហើយ

    res.rows.forEach(item => {
      if (!item.expireDate) return;

      const expDate = new Date(item.expireDate);
      expDate.setHours(0, 0, 0, 0);

      const daysLeft = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

      let emoji = '';
      let status = '';
      let hotlineText = item.hotline ? `Hotline: ${item.hotline}` : '';

      if (daysLeft <= 0) {
        emoji = '🔥';
        status = 'ផុតកំណត់ហើយ';
        criticalAlerts.push(
          `${emoji} <b>ទីតាំង៖ ${item.siteName || 'N/A'}</b>\n` +
          `   ក្រុមហ៊ុន៖ ${item.partner || '-'}\n` +
          `   System ID៖ ${item.entryId || '-'}\n` +
          `   ស្ថានភាព៖ ${status}\n` +
          `   ផុតកំណត់៖ ${expDate.toLocaleDateString('km-KH')}\n` +
          (hotlineText ? `   ${hotlineText}\n` : '')
        );
      } else if (daysLeft <= 7) {
        emoji = '‼️';
        status = `នៅសល់ ${daysLeft} ថ្ងៃប៉ុណ្ណោះ`;
        alerts.push(
          `${emoji} <b>ទីតាំង៖ ${item.siteName || 'N/A'}</b>\n` +
          `   ក្រុមហ៊ុន៖ ${item.partner || '-'}\n` +
          `   System ID៖ ${item.entryId || '-'}\n` +
          `   ស្ថានភាព៖ ${status}\n` +
          `   ផុតកំណត់៖ ${expDate.toLocaleDateString('km-KH')}\n` +
          (hotlineText ? `   ${hotlineText}\n` : '')
        );
      } else if (daysLeft <= 14) {
        emoji = '⚠️';
        status = `នៅសល់ ${daysLeft} ថ្ងៃ`;
        alerts.push(
          `${emoji} <b>ទីតាំង៖ ${item.siteName || 'N/A'}</b>\n` +
          `   ក្រុមហ៊ុន៖ ${item.partner || '-'}\n` +
          `   System ID៖ ${item.entryId || '-'}\n` +
          `   ស្ថានភាព៖ ${status}\n` +
          `   ផុតកំណត់៖ ${expDate.toLocaleDateString('km-KH')}\n` +
          (hotlineText ? `   ${hotlineText}\n` : '')
        );
      }
    });

    if (alerts.length > 0 || criticalAlerts.length > 0) {
      let message = `🔔 ការជូនដំណឹងផុតកំណត់ (${alerts.length + criticalAlerts.length} ករណី)\n` +
                    `ថ្ងៃ៖ ${today.toLocaleDateString('km-KH')}\n` +
                    `────────────────────\n\n`;

      if (criticalAlerts.length > 0) {
        message += `<b>🔥 ផុតកំណត់ហើយ (${criticalAlerts.length} ករណី)</b>\n` +
                   criticalAlerts.join('\n') + '\n\n';
      }

      message += alerts.join('\n') + '\n\n' +
                 `សូមពិនិត្យ និងធ្វើការពន្យារដោយឆាប់រហ័ស!\n` +
                 `Kimmex Network Inclusion System`;

      // ផ្ញើទៅ Telegram
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML'
        })
      });

      console.log('Alerts sent:', alerts.length + criticalAlerts.length);

      // កត់ត្រាថ្ងៃផ្ញើចុងក្រោយ
      await pool.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ' +
        'ON CONFLICT (key) DO UPDATE SET value = $2',
        ['last_telegram_alert_date', today.toISOString().split('T')[0]]
      );
    } else {
      console.log('No alerts today');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Checked' })
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  } finally {
    await pool.end();
  }
};
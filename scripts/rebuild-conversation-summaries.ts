import { dbPool } from '../src/server/db';

if (!dbPool) {
  throw new Error('DATABASE_URL is required.');
}

const client = await dbPool.connect();

try {
  await client.query('BEGIN');

  const result = await client.query(`
    WITH customer_activity AS (
      SELECT
        c.id AS conversation_id,
        COALESCE(NULLIF(ct.name, ''), 'Customer') AS customer_name,
        COUNT(m.id)::int AS customer_message_count,
        latest.content AS last_customer_message,
        latest.created_at AS last_customer_message_at
      FROM conversations c
      LEFT JOIN contacts ct ON ct.id = c.contact_id
      JOIN messages m
        ON m.conversation_id = c.id
       AND m.sender_type = 'contact'
      LEFT JOIN LATERAL (
        SELECT m2.content, m2.created_at
        FROM messages m2
        WHERE m2.conversation_id = c.id
          AND m2.sender_type = 'contact'
        ORDER BY m2.created_at DESC
        LIMIT 1
      ) latest ON TRUE
      WHERE c.channel IN ('email', 'whatsapp')
      GROUP BY c.id, ct.name, latest.content, latest.created_at
    )
    INSERT INTO conversation_summaries (
      conversation_id,
      summary_text,
      customer_message_count,
      last_customer_message,
      last_customer_message_at,
      updated_at
    )
    SELECT
      ca.conversation_id,
      ca.customer_name || ' contacted support about: ' || LEFT(COALESCE(ca.last_customer_message, ''), 180),
      ca.customer_message_count,
      ca.last_customer_message,
      ca.last_customer_message_at,
      NOW()
    FROM customer_activity ca
    ON CONFLICT (conversation_id) DO NOTHING
    RETURNING conversation_id
  `);

  await client.query('COMMIT');
  console.log(`Conversation summaries rebuilt: ${result.rowCount || 0} new rows.`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await dbPool.end();
}

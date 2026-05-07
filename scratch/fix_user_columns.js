
const { Client } = require('pg');

const DB_CONFIG = {
  host: '66.33.22.240',
  port: 45505,
  user: 'postgres',
  password: 'RvkwtnMaGpHpXnkqniMeDvRBOKAxihdI',
  database: 'railway',
  ssl: { rejectUnauthorized: false },
};

async function fixUserColumns() {
  const client = new Client(DB_CONFIG);
  try {
    await client.connect();
    console.log('✅ Connected to DB');

    const columnsToAdd = [
      { name: 'trust_score', type: 'integer', default: 50 },
      { name: 'review_count', type: 'integer', default: 0 },
      { name: 'helpful_votes_count', type: 'integer', default: 0 },
      { name: 'spam_flags_count', type: 'integer', default: 0 },
      { name: 'notification_settings', type: 'jsonb', default: "'{}'" },
      { name: 'deletion_scheduled_at', type: 'timestamp', default: null }
    ];

    for (const col of columnsToAdd) {
      const checkSql = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = $1
      `;
      const res = await client.query(checkSql, [col.name]);
      
      if (res.rows.length === 0) {
        console.log(`🔧 Adding column: ${col.name}`);
        const addSql = `ALTER TABLE users ADD COLUMN "${col.name}" ${col.type} ${col.default !== null ? `DEFAULT ${col.default}` : ''}`;
        await client.query(addSql);
        console.log(`✅ Added ${col.name}`);
      } else {
        console.log(`⏭️  Column ${col.name} already exists`);
      }
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
    console.log('👋 Disconnected');
  }
}

fixUserColumns();

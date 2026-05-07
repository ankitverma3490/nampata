
const { Client } = require('pg');

const DB_CONFIG = {
  host: '66.33.22.240',
  port: 45505,
  user: 'postgres',
  password: 'RvkwtnMaGpHpXnkqniMeDvRBOKAxihdI',
  database: 'railway',
  ssl: { rejectUnauthorized: false },
};

async function fixSubscriptionTables() {
  const client = new Client(DB_CONFIG);
  try {
    await client.connect();
    console.log('✅ Connected to DB');

    const tablesToFix = [
      {
        name: 'active_plans',
        columns: [
          { name: 'target_id', type: 'uuid', default: null },
          { name: 'transaction_id', type: 'varchar', default: null },
          { name: 'amount_paid', type: 'decimal(10,2)', default: 0 }
        ]
      },
      {
        name: 'pricing_plans',
        columns: [
          { name: 'stripe_price_id', type: 'varchar', default: null },
          { name: 'features', type: 'jsonb', default: "'{}'" }
        ]
      }
    ];

    for (const table of tablesToFix) {
      console.log(`\n📂 Checking table: ${table.name}`);
      for (const col of table.columns) {
        const checkSql = `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2
        `;
        const res = await client.query(checkSql, [table.name, col.name]);
        
        if (res.rows.length === 0) {
          console.log(`🔧 Adding column: ${col.name} to ${table.name}`);
          const addSql = `ALTER TABLE ${table.name} ADD COLUMN "${col.name}" ${col.type} ${col.default !== null ? `DEFAULT ${col.default}` : ''}`;
          try {
            await client.query(addSql);
            console.log(`✅ Added ${col.name}`);
          } catch (e) {
            console.error(`❌ Failed to add ${col.name}: ${e.message}`);
          }
        } else {
          console.log(` Greenland: Column ${col.name} already exists in ${table.name}`);
        }
      }
    }

  } catch (err) {
    console.error('❌ Fatal Error:', err.message);
  } finally {
    await client.end();
    console.log('\n👋 Disconnected');
  }
}

fixSubscriptionTables();

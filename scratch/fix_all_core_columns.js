
const { Client } = require('pg');

const DB_CONFIG = {
  host: '66.33.22.240',
  port: 45505,
  user: 'postgres',
  password: 'RvkwtnMaGpHpXnkqniMeDvRBOKAxihdI',
  database: 'railway',
  ssl: { rejectUnauthorized: false },
};

async function fixCoreTables() {
  const client = new Client(DB_CONFIG);
  try {
    await client.connect();
    console.log('✅ Connected to DB');

    const tablesToFix = [
      {
        name: 'users',
        columns: [
          { name: 'trust_score', type: 'integer', default: 50 },
          { name: 'review_count', type: 'integer', default: 0 },
          { name: 'helpful_votes_count', type: 'integer', default: 0 },
          { name: 'spam_flags_count', type: 'integer', default: 0 },
          { name: 'notification_settings', type: 'jsonb', default: "'{}'" },
          { name: 'deletion_scheduled_at', type: 'timestamp', default: null }
        ]
      },
      {
        name: 'vendors',
        columns: [
          { name: 'slug', type: 'varchar', default: null },
          { name: 'stripe_customer_id', type: 'varchar', default: null },
          { name: 'business_email', type: 'varchar', default: null },
          { name: 'business_phone', type: 'varchar(20)', default: null },
          { name: 'business_address', type: 'text', default: null },
          { name: 'gst_number', type: 'varchar(15)', default: null },
          { name: 'ntn_number', type: 'varchar(15)', default: null },
          { name: 'is_verified', type: 'boolean', default: false },
          { name: 'verification_documents', type: 'jsonb', default: null },
          { name: 'business_hours', type: 'jsonb', default: null },
          { name: 'social_links', type: 'jsonb', default: "'[]'" }
        ]
      },
      {
        name: 'businesses',
        columns: [
          { name: 'is_featured', type: 'boolean', default: false },
          { name: 'is_sponsored', type: 'boolean', default: false },
          { name: 'recent_until', type: 'timestamp', default: null },
          { name: 'average_rating', type: 'decimal(3,2)', default: 0 },
          { name: 'total_reviews', type: 'integer', default: 0 },
          { name: 'total_views', type: 'integer', default: 0 },
          { name: 'total_leads', type: 'integer', default: 0 },
          { name: 'followers_count', type: 'integer', default: 0 },
          { name: 'meta_title', type: 'varchar', default: null },
          { name: 'meta_description', type: 'text', default: null },
          { name: 'meta_keywords', type: 'text', default: null },
          { name: 'search_keywords', type: 'jsonb', default: "'[]'" },
          { name: 'has_offer', type: 'boolean', default: false },
          { name: 'offer_title', type: 'varchar(150)', default: null },
          { name: 'offer_description', type: 'text', default: null },
          { name: 'offer_badge', type: 'varchar(60)', default: null },
          { name: 'offer_expires_at', type: 'timestamp', default: null },
          { name: 'offer_banner_url', type: 'text', default: null },
          { name: 'faqs', type: 'jsonb', default: "'[]'" },
          { name: 'short_description', type: 'varchar(500)', default: null },
          { name: 'whatsapp', type: 'varchar(20)', default: null }
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

fixCoreTables();

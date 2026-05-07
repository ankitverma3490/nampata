
const { Client } = require('pg');

async function checkPricingPlans() {
    const client = new Client({
        host: '66.33.22.240',
        port: 45505,
        user: 'postgres',
        password: 'RvkwtnMaGpHpXnkqniMeDvRBOKAxihdI',
        database: 'railway',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query('SELECT * FROM pricing_plans');
        console.log('Pricing Plans:', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Operation failed:', err);
    } finally {
        await client.end();
    }
}

checkPricingPlans();

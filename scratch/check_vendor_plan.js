
const { Client } = require('pg');

async function checkVendorPlan() {
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
        const userId = 'a562e273-cb39-4152-bea2-9c7fa3be4bf1';
        
        console.log(`Checking vendor plan for user ID: ${userId}`);
        
        console.log('\n--- Checking subscriptions (Old System) ---');
        const subSql = `
            SELECT s.id, s.status, s.start_date, s.end_date, p.name as plan_name
            FROM subscriptions s
            JOIN vendors v ON s.vendor_id = v.id
            JOIN subscription_plans p ON s.plan_id = p.id
            WHERE v.user_id = $1
        `;
        const subRes = await client.query(subSql, [userId]);
        console.log(JSON.stringify(subRes.rows, null, 2));

        console.log('\n--- Checking active_plans (New System) ---');
        const activePlanSql = `
            SELECT ap.id, ap.status, ap.start_date, ap.end_date, p.name as plan_name
            FROM active_plans ap
            JOIN vendors v ON ap.vendor_id = v.id
            JOIN pricing_plans p ON ap.plan_id = p.id
            WHERE v.user_id = $1
        `;
        const apRes = await client.query(activePlanSql, [userId]);
        console.log(JSON.stringify(apRes.rows, null, 2));

    } catch (err) {
        console.error('Operation failed:', err);
    } finally {
        await client.end();
    }
}

checkVendorPlan();

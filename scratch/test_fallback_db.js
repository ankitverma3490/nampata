
const { Client } = require('pg');

async function testFallback() {
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
        const userId = '251648a1-cc80-4da2-887e-97ecb872b251'; // amanjeetthakur644@gmail.com
        
        console.log(`Testing fallback for user ID: ${userId}`);
        
        // 1. Get Vendor
        const vendorRes = await client.query('SELECT id FROM vendors WHERE user_id = $1', [userId]);
        if (vendorRes.rows.length === 0) {
            console.log('No vendor found.');
            return;
        }
        const vendorId = vendorRes.rows[0].id;
        console.log(`Vendor ID: ${vendorId}`);

        // 2. Check if they have ANY active plan
        const apRes = await client.query('SELECT id FROM active_plans WHERE vendor_id = $1 AND status = \'active\'', [vendorId]);
        const subRes = await client.query('SELECT id FROM subscriptions WHERE vendor_id = $1 AND status = \'active\'', [vendorId]);
        
        console.log(`Active plans (New System): ${apRes.rows.length}`);
        console.log(`Active subscriptions (Old System): ${subRes.rows.length}`);

        if (apRes.rows.length === 0 && subRes.rows.length === 0) {
            console.log('User has NO active plan. Fallback logic should trigger.');
            
            // 3. Check for "Free" plan in old system
            const freePlanRes = await client.query('SELECT * FROM subscription_plans WHERE name = \'Free\'');
            if (freePlanRes.rows.length > 0) {
                console.log('Found Free plan in old system. Fallback should work!');
            } else {
                console.log('CRITICAL: Free plan NOT found in old system either!');
            }
        }

    } catch (err) {
        console.error('Operation failed:', err);
    } finally {
        await client.end();
    }
}

testFallback();

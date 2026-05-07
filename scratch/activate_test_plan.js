
const { Client } = require('pg');

async function activatePlanForVendor() {
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
        const vendorId = 'fa134a03-0700-4862-856d-3528442bd1e8'; // Test Vendor
        const planId = '5cfaf40b-4adb-4540-a9ee-c9a17a30b740'; // Basic Plan
        
        console.log(`Activating Basic Plan for Vendor: ${vendorId}`);
        
        // Simulating processSubscriptionSuccess
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        // 1. Create Subscription
        const subSql = `
            INSERT INTO subscriptions 
            (vendor_id, plan_id, status, start_date, end_date, amount, auto_renew)
            VALUES ($1, $2, 'active', $3, $4, $5, false)
            RETURNING id;
        `;
        const subRes = await client.query(subSql, [vendorId, planId, now, endDate, 150.00]);
        const subId = subRes.rows[0].id;
        console.log(`Created Subscription ID: ${subId}`);
        
        // 2. Create Transaction
        const transSql = `
            INSERT INTO transactions 
            (subscription_id, vendor_id, amount, status, paid_at, gateway_transaction_id, payment_gateway, invoice_number)
            VALUES ($1, $2, $3, 'completed', $4, $5, 'Mock', $6);
        `;
        const transId = 'MOCK-CHECK-' + Date.now();
        const invoiceNum = 'INV-MOCK-' + Date.now();
        await client.query(transSql, [subId, vendorId, 150.00, now, transId, invoiceNum]);
        console.log(`Created Transaction: ${transId}`);

        console.log('✅ Plan activated successfully.');

    } catch (err) {
        console.error('Operation failed:', err);
    } finally {
        await client.end();
    }
}

activatePlanForVendor();

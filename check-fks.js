const db = require('./src/config/db.config');

async function checkFKs() {
    try {
        const [users] = await db.execute("SELECT id FROM users LIMIT 1");
        const [products] = await db.execute("SELECT id FROM products LIMIT 1");
        const [events] = await db.execute("SELECT id FROM events LIMIT 1");

        console.log("Valid User ID:", users[0]?.id || 'Need to create user');
        console.log("Valid Product ID:", products[0]?.id || 'Need to create product');
        console.log("Valid Event ID:", events[0]?.id || 'Need to create event');

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkFKs();

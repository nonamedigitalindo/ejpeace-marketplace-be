
const db = require('./src/config/db.config');

async function checkSchema() {
    try {
        const [rows] = await db.execute("DESCRIBE vouchers");
        console.log(rows.map(r => `${r.Field}: ${r.Type}`).join('\n'));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();

// Run explicitly once: node --env-file=.env.local migrate-to-supabase.js
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { createStore } = require('./supabase-store');

async function migrate() {
    const store = createStore();
    const db = new sqlite3.Database(path.join(__dirname, 'garage.db'), sqlite3.OPEN_READONLY);
    const rows = await new Promise((resolve, reject) => db.all('SELECT * FROM products ORDER BY id', (e, r) => e ? reject(e) : resolve(r)));
    await new Promise((resolve, reject) => db.close(e => e ? reject(e) : resolve()));
    const prepared = rows.map(row => ({
        title: row.title, price: row.price, status: row.status, new: row.isNew === 1,
        description: JSON.parse(row.description), images: JSON.parse(row.images), import_key: `sqlite:${row.id}`
    }));
    const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
    const files = new Map();
    // Check every image before starting any upload or database write.
    for (const product of prepared) for (const image of product.images) {
        if (!image.startsWith('/uploads/') || path.basename(image) !== image.slice(9)) throw new Error('Unexpected local image path');
        const name = path.basename(image);
        const mimetype = types[path.extname(name).toLowerCase()];
        if (!mimetype) throw new Error('Unsupported image in migration');
        files.set(image, { buffer: fs.readFileSync(path.join(__dirname, 'uploads', name)), mimetype });
    }
    fs.writeFileSync(path.join(__dirname, 'migration-backup.json'), JSON.stringify(prepared, null, 2));
    const existing = await store.list();
    let count = 0;
    for (const product of prepared) {
        if (existing.some(row => row.import_key === product.import_key)) {
            console.log('Already imported:', product.title);
            continue;
        }
        const images = [];
        for (const image of product.images) images.push(await store.upload(files.get(image), 'import-' + path.basename(image)));
        await store.add({ ...product, images });
        count++;
        console.log('Imported:', product.title);
    }
    const result = await store.list();
    for (const product of prepared) {
        const imported = result.find(row => row.import_key === product.import_key);
        if (!imported || imported.images.length !== product.images.length) throw new Error('Migration verification failed');
        for (const url of imported.images) {
            const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(30000) });
            if (!response.ok) throw new Error('Uploaded photo is not accessible');
        }
    }
    console.log(`Verified ${prepared.length} products and ${files.size} photos; added ${count} products.`);
}
migrate().catch(error => { console.error(error.message); process.exitCode = 1; });

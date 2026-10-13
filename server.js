const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { createStore } = require('./supabase-store');

const cloudEnabled = Boolean(process.env.SUPABASE_URL || process.env.SUPABASE_SECRET_KEY);
const cloud = cloudEnabled ? createStore() : null;
const db = cloud ? null : require('./database');
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '20kb' }));
const sessions = new Map();
const attempts = new Map();
const adminPassword = process.env.ADMIN_PASSWORD;
const uploadsDir = path.join(__dirname, 'uploads');
if (!cloud) fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 5, fileSize: 10 * 1024 * 1024, fields: 1, fieldSize: 20000 }, fileFilter(req, file, cb) {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) return cb(Object.assign(new Error('Используйте JPG, PNG, WebP или GIF'), { status: 400 }));
    cb(null, true);
} });
function session(req) {
    const token = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('garage_session='))?.slice(15);
    const expiry = sessions.get(token);
    if (expiry && expiry > Date.now()) return true;
    if (token) sessions.delete(token);
    return false;
}
function protect(req, res, next) {
    if (!session(req)) return res.status(401).json({ success: false, error: 'Войдите в админку' });
    if (req.headers.origin && req.headers.origin !== `${req.protocol}://${req.get('host')}`) return res.sendStatus(403);
    next();
}
app.post('/api/admin/login', (req, res) => {
    if (!adminPassword) return res.status(503).json({ error: 'Пароль администратора ещё не настроен' });
    const now = Date.now();
    const entry = attempts.get(req.ip);
    if (entry && entry.until > now && entry.count >= 10) return res.status(429).json({ error: 'Слишком много попыток. Попробуйте через 15 минут.' });
    const expected = crypto.createHash('sha256').update(adminPassword).digest();
    const actual = crypto.createHash('sha256').update(String(req.body.password || '')).digest();
    if (!crypto.timingSafeEqual(expected, actual)) {
        const current = entry && entry.until > now ? entry : { count: 0, until: now + 900000 };
        current.count++;
        attempts.set(req.ip, current);
        return res.status(401).json({ error: 'Неверный пароль' });
    }
    attempts.delete(req.ip);
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, now + 8 * 3600000);
    res.cookie('garage_session', token, { httpOnly: true, sameSite: 'strict', secure: req.secure, maxAge: 8 * 3600000 });
    res.json({ success: true });
});
app.get('/api/admin/session', (req, res) => res.json({ authenticated: session(req) }));
setInterval(() => {
    const now = Date.now();
    for (const [key, expiry] of sessions) if (expiry <= now) sessions.delete(key);
    for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
}, 60000).unref();
const all = (sql, args = []) => new Promise((resolve, reject) => db.all(sql, args, (e, rows) => e ? reject(e) : resolve(rows)));
const run = (sql, args) => new Promise((resolve, reject) => db.run(sql, args, function(e) { e ? reject(e) : resolve({ id: this.lastID, changes: this.changes }); }));
function normalize(row) {
    return { id: row.id, title: row.title, price: row.price, status: row.status, new: row.isNew === 1, description: JSON.parse(row.description), images: JSON.parse(row.images) };
}
function productInput(req) {
    let p;
    try { p = JSON.parse(req.body.product); } catch { throw Object.assign(new Error('Некорректные данные товара'), { status: 400 }); }
    const invalid = message => { throw Object.assign(new Error(message), { status: 400 }); };
    if (!p || typeof p !== 'object') invalid('Некорректные данные товара');
    if (typeof p.title !== 'string' || !p.title.trim()) invalid('Введите название товара');
    if (p.title.trim().length > 300) invalid('Название слишком длинное: максимум 300 символов. Подробности перенесите в описание.');
    if (typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price < 0) invalid('Введите цену числом, не меньше нуля');
    if (!['available', 'reserve', 'sold'].includes(p.status)) invalid('Выберите статус товара заново: В наличии, Бронь или Продано');
    if (!Array.isArray(p.description) || p.description.some(x => typeof x !== 'string')) invalid('Некорректный формат описания. Обновите страницу и введите описание заново.');
    return { title: p.title.trim(), price: p.price, status: p.status, new: Boolean(p.new), description: p.description };
}
function productId(req) {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw Object.assign(new Error('Некорректный номер товара'), { status: 400 });
    return id;
}
async function storePhotos(files) {
    const images = [];
    try {
        for (const file of files) {
            if (cloud) images.push(await cloud.upload(file));
            else {
                const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }[file.mimetype];
                const name = crypto.randomUUID() + ext;
                await fs.promises.writeFile(path.join(uploadsDir, name), file.buffer);
                images.push('/uploads/' + name);
            }
        }
        return images;
    } catch (e) { await cleanPhotos(images); throw e; }
}
async function cleanPhotos(images) {
    try {
        if (cloud) await cloud.clean(images);
        else for (const url of images) if (url.startsWith('/uploads/') && path.basename(url) === url.slice(9)) await fs.promises.unlink(path.join(uploadsDir, path.basename(url))).catch(() => {});
    } catch { console.error('Photo cleanup failed; retry cleanup separately'); }
}
app.get('/api/products', async (req, res) => {
    const products = cloud ? await cloud.list() : (await all('SELECT * FROM products ORDER BY id DESC')).map(normalize);
    res.json(products);
});
app.post('/api/products', protect, upload.array('photos', 5), async (req, res) => {
    const product = productInput(req);
    if (!req.files.length) return res.status(400).json({ success: false, error: 'Добавьте фотографию' });
    const images = await storePhotos(req.files);
    try {
        if (cloud) await cloud.add({ ...product, images });
        else await run('INSERT INTO products (title,price,status,isNew,description,images) VALUES (?,?,?,?,?,?)', [product.title, product.price, product.status, product.new ? 1 : 0, JSON.stringify(product.description), JSON.stringify(images)]);
    } catch (e) { await cleanPhotos(images); throw e; }
    res.json({ success: true });
});
app.put('/api/products/:id', protect, upload.array('photos', 5), async (req, res) => {
    const id = productId(req);
    const product = productInput(req);
    const old = cloud ? await cloud.get(id) : (await all('SELECT * FROM products WHERE id=?', [id])).map(normalize)[0];
    if (!old) return res.status(404).json({ success: false, error: 'Товар не найден' });
    const changedPhotos = req.files.length > 0;
    const images = changedPhotos ? await storePhotos(req.files) : old.images;
    try {
        if (cloud) await cloud.update(id, { ...product, images });
        else await run('UPDATE products SET title=?,price=?,status=?,isNew=?,description=?,images=? WHERE id=?', [product.title, product.price, product.status, product.new ? 1 : 0, JSON.stringify(product.description), JSON.stringify(images), id]);
    } catch (e) { if (changedPhotos) await cleanPhotos(images); throw e; }
    if (changedPhotos) await cleanPhotos(old.images);
    res.json({ success: true });
});
app.delete('/api/products/:id', protect, async (req, res) => {
    const id = productId(req);
    const old = cloud ? await cloud.remove(id) : (await all('SELECT * FROM products WHERE id=?', [id])).map(normalize)[0];
    if (!old) return res.status(404).json({ success: false, error: 'Товар не найден' });
    if (!cloud) await run('DELETE FROM products WHERE id=?', [id]);
    await cleanPhotos(old.images);
    res.json({ success: true });
});
// Only public assets are served; database, source and environment files stay private.
for (const file of ['index.html', 'admin.html', 'style.css', 'script.js', 'admin.js']) app.get(file === 'index.html' ? ['/', '/index.html'] : '/' + file, (req, res) => res.sendFile(path.join(__dirname, file)));
app.use('/img', express.static(path.join(__dirname, 'img')));
if (!cloud) app.use('/uploads', express.static(uploadsDir));
app.use((err, req, res, next) => {
    const status = err instanceof multer.MulterError ? 400 : err.status || 500;
    console.error('Request failed:', err.message);
    res.status(status).json({ success: false, error: status === 500 ? 'Не удалось выполнить запрос. Попробуйте позже.' : err.message });
});
if (require.main === module) app.listen(process.env.PORT || 3000, () => console.log(`Garage started (${cloud ? 'Supabase' : 'local SQLite'})`));
module.exports = app;

const { randomUUID } = require('crypto');

function createStore(env = process.env) {
    const base = (env.SUPABASE_URL || '').replace(/\/$/, '');
    const key = env.SUPABASE_SECRET_KEY;
    if (!base || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY together');
    if (!base.startsWith('https://')) throw new Error('SUPABASE_URL must use HTTPS');
    const bucket = 'product-photos';
    async function request(route, options = {}) {
        const headers = { apikey: key, ...options.headers };
        if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
        const response = await fetch(base + route, { ...options, headers, signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
        const body = await response.text();
        return body ? JSON.parse(body) : null;
    }
    const json = { 'Content-Type': 'application/json', Prefer: 'return=representation' };
    return {
        list: () => request('/rest/v1/products?select=*&order=id.desc'),
        async get(id) { return (await request(`/rest/v1/products?id=eq.${id}&select=*`))[0]; },
        async add(product) { return (await request('/rest/v1/products', { method: 'POST', headers: json, body: JSON.stringify(product) }))[0]; },
        async update(id, product) { return (await request(`/rest/v1/products?id=eq.${id}`, { method: 'PATCH', headers: json, body: JSON.stringify(product) }))[0]; },
        async remove(id) { return (await request(`/rest/v1/products?id=eq.${id}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } }))[0]; },
        async upload(file, objectName) {
            const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }[file.mimetype];
            if (!ext) throw new Error('Unsupported image type');
            const name = objectName || randomUUID() + ext;
            await request(`/storage/v1/object/${bucket}/${encodeURIComponent(name)}`, {
                method: 'POST', headers: { 'Content-Type': file.mimetype, 'x-upsert': objectName ? 'true' : 'false' }, body: file.buffer
            });
            return `${base}/storage/v1/object/public/${bucket}/${encodeURIComponent(name)}`;
        },
        async clean(images) {
            const prefix = `${base}/storage/v1/object/public/${bucket}/`;
            const prefixes = images.filter(url => url.startsWith(prefix)).map(url => decodeURIComponent(url.slice(prefix.length)));
            if (prefixes.length) await request(`/storage/v1/object/${bucket}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes }) });
        }
    };
}
module.exports = { createStore };

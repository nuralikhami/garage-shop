const test = require('node:test');
const assert = require('node:assert/strict');

test('Cloud CRUD, photo rollback, admin protection and private files', async () => {
    const originalFetch = global.fetch;
    process.env.SUPABASE_URL = 'https://garage-test.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
    process.env.ADMIN_PASSWORD = 'test-private-password';
    let products = [];
    const photos = new Set();
    let failInsert = false;
    global.fetch = async (url, options = {}) => {
        if (!String(url).startsWith(process.env.SUPABASE_URL)) return originalFetch(url, options);
        assert.equal(options.headers.apikey, 'sb_secret_test');
        assert.equal(options.headers.Authorization, undefined);
        const route = new URL(url);
        const method = options.method || 'GET';
        if (route.pathname.startsWith('/storage/v1/object/')) {
            if (method === 'DELETE') JSON.parse(options.body).prefixes.forEach(p => photos.delete(p));
            else photos.add(decodeURIComponent(route.pathname.split('/').pop()));
            return Response.json({});
        }
        const id = Number((route.searchParams.get('id') || '').slice(3));
        if (method === 'POST') {
            if (failInsert) return Response.json({}, { status: 503 });
            const row = { ...JSON.parse(options.body), id: products.length + 1 };
            products.push(row);
            return Response.json([row]);
        }
        if (method === 'PATCH') {
            const row = products.find(p => p.id === id);
            Object.assign(row, JSON.parse(options.body));
            return Response.json([row]);
        }
        if (method === 'DELETE') {
            const row = products.find(p => p.id === id);
            products = products.filter(p => p.id !== id);
            return Response.json(row ? [row] : []);
        }
        return Response.json(id ? products.filter(p => p.id === id) : products);
    };
    const server = require('./server').listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    let cookie;
    async function call(route, options = {}) {
        return originalFetch(base + route, { ...options, headers: { ...(cookie ? { Cookie: cookie } : {}), ...options.headers } });
    }
    function form(title, photo) {
        const body = new FormData();
        body.append('product', JSON.stringify({ title, price: 100, status: 'available', new: true, description: ['Описание'] }));
        if (photo) body.append('photos', new Blob([new Uint8Array([255, 216, 255])], { type: 'image/jpeg' }), 'test.jpg');
        return body;
    }
    try {
        for (const method of ['POST', 'PUT', 'DELETE']) {
            assert.equal((await call(method === 'POST' ? '/api/products' : '/api/products/1', { method })).status, 401);
        }
        for (const route of ['/garage.db', '/server.js', '/.env.local', '/package.json', '/migration-backup.json']) assert.equal((await call(route)).status, 404);
        assert.equal((await call('/')).status, 200);
        let response = await call('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'wrong' }) });
        assert.equal(response.status, 401);
        response = await call('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }) });
        assert.equal(response.status, 200);
        cookie = response.headers.get('set-cookie').split(';')[0];
        assert.equal((await (await call('/api/admin/session')).json()).authenticated, true);
        const tooLong = await call('/api/products', { method: 'POST', body: form('А'.repeat(301), true) });
        assert.equal(tooLong.status, 400);
        assert.match((await tooLong.json()).error, /300/);
        assert.equal(photos.size, 0);
        const invalidStatus = new FormData();
        invalidStatus.append('product', JSON.stringify({ title: 'Товар', price: 100, status: '', description: ['Описание'] }));
        const statusResponse = await call('/api/products', { method: 'POST', body: invalidStatus });
        assert.equal(statusResponse.status, 400);
        assert.match((await statusResponse.json()).error, /статус/);
        assert.equal((await call('/api/products', { method: 'POST', body: form('Товар', true), headers: { Origin: 'https://other.example' } })).status, 403);
        assert.equal((await call('/api/products', { method: 'POST', body: form('Товар', true) })).status, 200);
        assert.equal(products.length, 1);
        assert.equal(photos.size, 1);
        const firstPhoto = products[0].images[0];
        assert.equal((await call('/api/products/1', { method: 'PUT', body: form('Изменён', false) })).status, 200);
        assert.equal(products[0].images[0], firstPhoto);
        assert.equal((await call('/api/products/1', { method: 'PUT', body: form('Изменён', true) })).status, 200);
        assert.notEqual(products[0].images[0], firstPhoto);
        assert.equal(photos.size, 1);
        const reconnected = require('./supabase-store').createStore();
        assert.equal((await reconnected.list())[0].title, 'Изменён');
        failInsert = true;
        assert.equal((await call('/api/products', { method: 'POST', body: form('Ошибка', true) })).status, 500);
        assert.equal(photos.size, 1);
        assert.equal((await call('/api/products/1', { method: 'DELETE' })).status, 200);
        assert.equal(photos.size, 0);
        assert.equal(products.length, 0);
    } finally {
        global.fetch = originalFetch;
        await new Promise(resolve => server.close(resolve));
    }
});

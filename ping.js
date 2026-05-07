const https = require('https');

const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: '/bot8384742443:AAH9fYL14DYmCFVPAipqbt9oySp6lzMghy4/deleteWebhook?drop_pending_updates=True',
    method: 'POST',
    family: 4 // принудительно IPv4
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => console.log('✅ Ответ:', data));
});
req.on('error', (e) => console.error('❌ Ошибка:', e.message));
req.end();
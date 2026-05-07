const https = require('https');

const token = '8384742443:AAH9fYL14DYmCFVPAipqbt9oySp6lzMghy4';
const path = `/bot${token}/deleteWebhook?drop_pending_updates=True`;

const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: path,
    method: 'POST',
    family: 4
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('✅ Ответ Telegram API:', data);
        process.exit(0);
    });
});
req.on('error', (e) => {
    console.error('❌ Ошибка:', e.message);
    process.exit(1);
});
req.end();
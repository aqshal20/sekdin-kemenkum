const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode  = require('qrcode');

let client    = null;
let isReady   = false;
let lastQR    = null;   // raw QR string
let lastQRImg = null;   // data URL PNG
let waStatus  = 'disconnected'; // 'disconnected' | 'qr' | 'authenticated' | 'ready'
let _io       = null;   // Socket.IO instance, injected via setIO()

function setIO(io) {
    _io = io;
}

async function generateQRDataURL(qrStr) {
    try {
        return await QRCode.toDataURL(qrStr, { width: 280, margin: 2 });
    } catch (e) {
        console.error('QR DataURL error:', e);
        return null;
    }
}

function initializeWhatsApp() {
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--ignore-certificate-errors'
            ],
            timeout: 60000
        }
    });

    client.on('qr', async (qr) => {
        console.log('\n=========================================');
        console.log('📲 SCAN QR CODE INI MENGGUNAKAN WHATSAPP (LINKED DEVICES):');
        console.log('=========================================\n');
        qrcode.generate(qr, { small: true });
        console.log('\n=========================================');

        lastQR     = qr;
        lastQRImg  = await generateQRDataURL(qr);
        waStatus   = 'qr';

        if (_io) _io.to('admin_room').emit('whatsapp_status', {
            status: 'qr',
            qrImage: lastQRImg
        });
    });

    client.on('ready', () => {
        console.log('✅ WHATSAPP BOT BERHASIL TERHUBUNG & SIAP DIGUNAKAN!');
        isReady   = true;
        lastQR    = null;
        lastQRImg = null;
        waStatus  = 'ready';

        if (_io) _io.to('admin_room').emit('whatsapp_status', {
            status: 'ready',
            qrImage: null
        });
    });

    client.on('authenticated', () => {
        console.log('🔄 Otentikasi WhatsApp berhasil diselesaikan.');
        waStatus = 'authenticated';

        if (_io) _io.to('admin_room').emit('whatsapp_status', {
            status: 'authenticated',
            qrImage: null
        });
    });

    client.on('auth_failure', msg => {
        console.error('❌ Otentikasi WhatsApp Gagal:', msg);
        waStatus = 'disconnected';

        if (_io) _io.to('admin_room').emit('whatsapp_status', {
            status: 'disconnected',
            qrImage: null
        });
    });

    client.on('disconnected', (reason) => {
        console.log('❌ WhatsApp terputus:', reason);
        isReady  = false;
        waStatus = 'disconnected';
        lastQR   = null;
        lastQRImg = null;

        if (_io) _io.to('admin_room').emit('whatsapp_status', {
            status: 'disconnected',
            qrImage: null
        });

        client.initialize();
    });

    console.log("Mempersiapkan sistem WhatsApp otomatis...");
    client.initialize();
}

async function sendWhatsAppMessage(phone, message) {
    if (!isReady || !client) {
        console.log(`⚠️ WhatsApp belum siap, pesan ke ${phone} gagal dikirim.`);
        return false;
    }

    try {
        let formattedPhone = phone.replace(/[^0-9]/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '62' + formattedPhone.substring(1);
        }

        const chatId = `${formattedPhone}@c.us`;
        await client.sendMessage(chatId, message);
        console.log(`✅ Berhasil mengirim WhatsApp ke ${phone}`);
        return true;
    } catch (error) {
        console.error(`❌ Gagal mengirim WhatsApp ke ${phone}:`, error);
        return false;
    }
}

function getWhatsAppStatus() {
    return { status: waStatus, qrImage: lastQRImg, isReady };
}

module.exports = {
    initializeWhatsApp,
    sendWhatsAppMessage,
    getWhatsAppStatus,
    setIO
};

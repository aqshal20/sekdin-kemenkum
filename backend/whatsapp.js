const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let client = null;
let isReady = false;

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

    client.on('qr', (qr) => {
        console.log('\n=========================================');
        console.log('📲 SCAN QR CODE INI MENGGUNAKAN WHATSAPP (LINKED DEVICES):');
        console.log('=========================================\n');
        qrcode.generate(qr, { small: true });
        console.log('\n=========================================');
    });

    client.on('ready', () => {
        console.log('✅ WHATSAPP BOT BERHASIL TERHUBUNG & SIAP DIGUNAKAN!');
        isReady = true;
    });

    client.on('authenticated', () => {
        console.log('🔄 Otentikasi WhatsApp berhasil diselesaikan.');
    });

    client.on('auth_failure', msg => {
        console.error('❌ Otentikasi WhatsApp Gagal:', msg);
    });
    
    client.on('disconnected', (reason) => {
        console.log('❌ WhatsApp terputus:', reason);
        isReady = false;
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

module.exports = {
    initializeWhatsApp,
    sendWhatsAppMessage
};

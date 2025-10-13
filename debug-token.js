require('dotenv').config();

console.log('🔍 Debugging Discord Token...\n');

// Check if .env file exists and is loaded
if (!process.env.DISCORD_TOKEN) {
    console.log('❌ DISCORD_TOKEN tidak ditemukan di environment variables');
    console.log('📝 Pastikan file .env ada dan berisi DISCORD_TOKEN');
    process.exit(1);
}

const token = process.env.DISCORD_TOKEN;
console.log('✅ DISCORD_TOKEN ditemukan');
console.log(`📏 Panjang token: ${token.length} karakter`);
console.log(`🔤 Format token: ${token.substring(0, 10)}...${token.substring(token.length - 10)}`);

// Check token format
if (token.includes(' ')) {
    console.log('⚠️  WARNING: Token mengandung spasi! Pastikan tidak ada spasi di awal/akhir');
}

if (token.includes('\n') || token.includes('\r')) {
    console.log('⚠️  WARNING: Token mengandung newline! Pastikan tidak ada baris baru');
}

// Check if token looks like a Discord bot token
const discordTokenPattern = /^[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}$/;
if (!discordTokenPattern.test(token)) {
    console.log('⚠️  Token tidak sesuai regex pattern, tapi tetap akan ditest...');
    console.log('📝 Format yang benar: XXXX.XXXX.XXXX');
    console.log('🔗 Pastikan Anda menggunakan Bot Token, bukan Client Secret atau token lainnya');
} else {
    console.log('✅ Token format terlihat benar');
}

// Test with Discord.js
console.log('\n🧪 Testing dengan Discord.js...');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.on('error', (error) => {
    console.log('❌ Discord.js Error:', error.message);
    if (error.message.includes('invalid token')) {
        console.log('\n🔧 Kemungkinan masalah:');
        console.log('1. Token tidak valid atau expired');
        console.log('2. Bot belum dibuat di Discord Developer Portal');
        console.log('3. Token bukan Bot Token (mungkin Client Secret)');
        console.log('4. Ada karakter yang tidak terlihat di token (spasi, newline, dll)');
    }
    process.exit(1);
});

client.login(token).catch((error) => {
    console.log('❌ Login failed:', error.message);
    process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
    console.log('⏰ Timeout - tidak bisa connect ke Discord');
    process.exit(1);
}, 10000);

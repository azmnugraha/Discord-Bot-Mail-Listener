const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function createEnvFile() {
    console.log('🔧 Setup File .env untuk Discord Email Bot');
    console.log('==========================================\n');

    console.log('📝 Pastikan Anda sudah membaca GET_DISCORD_TOKEN.md untuk mendapatkan token yang benar!\n');

    const discordToken = await question('Discord Bot Token (format: XXXX.XXXX.XXXX): ');
    
    // Validate token format
    if (!discordToken.includes('.') || discordToken.split('.').length !== 3) {
        console.log('\n❌ Format token tidak benar!');
        console.log('📝 Token harus memiliki format: XXXX.XXXX.XXXX');
        console.log('🔗 Baca GET_DISCORD_TOKEN.md untuk panduan lengkap');
        rl.close();
        return;
    }

    if (discordToken.length < 50) {
        console.log('\n❌ Token terlalu pendek!');
        console.log('📝 Token Discord bot biasanya ~70 karakter');
        console.log('🔗 Pastikan Anda menggunakan Bot Token, bukan Client Secret');
        rl.close();
        return;
    }

    const discordClientId = await question('Discord Client ID (angka): ');
    const discordChannelId = await question('Discord Channel ID (angka): ');
    const yahooEmail = await question('Yahoo Email: ');
    const yahooPassword = await question('Yahoo App Password: ');

    const envContent = `# Discord Bot Configuration
DISCORD_TOKEN=${discordToken}
DISCORD_CLIENT_ID=${discordClientId}
DISCORD_CHANNEL_ID=${discordChannelId}

# Yahoo Mail IMAP Configuration
YAHOO_EMAIL=${yahooEmail}
YAHOO_PASSWORD=${yahooPassword}
YAHOO_IMAP_HOST=imap.mail.yahoo.com
YAHOO_IMAP_PORT=993

# Bot Configuration
CHECK_INTERVAL=30000
`;

    try {
        fs.writeFileSync('.env', envContent);
        console.log('\n✅ File .env berhasil dibuat!');
        console.log('\n🧪 Testing token...');
        
        // Test the token
        const { Client, GatewayIntentBits } = require('discord.js');
        const client = new Client({ intents: [GatewayIntentBits.Guilds] });
        
        client.on('ready', () => {
            console.log('✅ Token Discord valid!');
            console.log(`   Bot name: ${client.user.tag}`);
            client.destroy();
            rl.close();
        });
        
        client.on('error', (error) => {
            console.log('❌ Token Discord tidak valid:', error.message);
            rl.close();
        });
        
        client.login(discordToken).catch(() => {
            console.log('❌ Gagal login dengan token ini');
            rl.close();
        });
        
    } catch (error) {
        console.log('\n❌ Error membuat file .env:', error.message);
        rl.close();
    }
}

createEnvFile();

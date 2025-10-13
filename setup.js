const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function setup() {
    console.log('🚀 Discord Email Bot Setup');
    console.log('==========================\n');

    console.log('This script will help you configure your Discord Email Bot.\n');

    // Check if .env already exists
    if (fs.existsSync('.env')) {
        const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
        if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
            console.log('Setup cancelled.');
            rl.close();
            return;
        }
    }

    console.log('\n📋 Discord Bot Configuration:');
    const discordToken = await question('Discord Bot Token: ');
    const discordClientId = await question('Discord Client ID: ');
    const discordChannelId = await question('Discord Channel ID: ');

    console.log('\n📧 Yahoo Mail Configuration:');
    const yahooEmail = await question('Yahoo Email Address: ');
    const yahooPassword = await question('Yahoo App Password: ');

    console.log('\n⚙️  Bot Configuration:');
    const checkInterval = await question('Email Check Interval (seconds, default 30): ') || '30';

    // Create .env content
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
CHECK_INTERVAL=${parseInt(checkInterval) * 1000}
`;

    // Write .env file
    try {
        fs.writeFileSync('.env', envContent);
        console.log('\n✅ .env file created successfully!');
    } catch (error) {
        console.error('\n❌ Error creating .env file:', error.message);
        rl.close();
        return;
    }

    console.log('\n📝 Setup Instructions:');
    console.log('1. Make sure your Discord bot has the following permissions:');
    console.log('   - Send Messages');
    console.log('   - Read Messages');
    console.log('   - Use Slash Commands');
    console.log('   - Embed Links');
    
    console.log('\n2. Make sure your Yahoo account has:');
    console.log('   - IMAP access enabled');
    console.log('   - 2-Factor Authentication enabled');
    console.log('   - App Password generated (use this as YAHOO_PASSWORD)');
    
    console.log('\n3. Test your configuration:');
    console.log('   npm run test');
    
    console.log('\n4. Start the bot:');
    console.log('   npm start');
    
    console.log('\n5. For development with auto-restart:');
    console.log('   npm run dev');

    const runTest = await question('\n🧪 Run connection test now? (Y/n): ');
    if (runTest.toLowerCase() !== 'n' && runTest.toLowerCase() !== 'no') {
        console.log('\nRunning connection tests...\n');
        rl.close();
        
        // Run the test
        require('./test-connection.js');
    } else {
        rl.close();
    }
}

// Handle Ctrl+C
rl.on('SIGINT', () => {
    console.log('\n\nSetup cancelled.');
    rl.close();
});

setup().catch(error => {
    console.error('\n❌ Setup error:', error.message);
    rl.close();
});


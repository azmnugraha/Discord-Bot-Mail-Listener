require('dotenv').config();
const Imap = require('imap');
const { simpleParser } = require('mailparser');

// Test IMAP connection to Yahoo
async function testImapConnection() {
    console.log('🧪 Testing IMAP connection to Yahoo Mail...');
    
    const imap = new Imap({
        user: process.env.YAHOO_EMAIL,
        password: process.env.YAHOO_PASSWORD,
        host: process.env.YAHOO_IMAP_HOST || 'imap.mail.yahoo.com',
        port: parseInt(process.env.YAHOO_IMAP_PORT) || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
    });

    return new Promise((resolve, reject) => {
        imap.once('ready', () => {
            console.log('✅ IMAP connection successful!');
            
            imap.openBox('INBOX', false, (err, box) => {
                if (err) {
                    console.error('❌ Error opening INBOX:', err);
                    imap.end();
                    reject(err);
                    return;
                }

                console.log(`📧 INBOX opened successfully. Total messages: ${box.messages.total}`);
                
                // Test fetching a recent email
                if (box.messages.total > 0) {
                    const fetch = imap.seq.fetch('*', {
                        bodies: '',
                        struct: true,
                        markSeen: false
                    });

                    fetch.on('message', (msg, seqno) => {
                        let buffer = '';
                        
                        msg.on('body', (stream, info) => {
                            stream.on('data', (chunk) => {
                                buffer += chunk.toString('utf8');
                            });
                        });

                        msg.once('end', async () => {
                            try {
                                const parsed = await simpleParser(buffer);
                                console.log(`📬 Test email parsed successfully:`);
                                console.log(`   From: ${parsed.from?.text || 'Unknown'}`);
                                console.log(`   Subject: ${parsed.subject || 'No Subject'}`);
                                console.log(`   Date: ${parsed.date}`);
                                console.log(`   Content Length: ${(parsed.text || '').length} characters`);
                            } catch (parseError) {
                                console.error('❌ Error parsing test email:', parseError);
                            }
                        });
                    });

                    fetch.once('error', (err) => {
                        console.error('❌ Fetch error:', err);
                        imap.end();
                        reject(err);
                    });

                    fetch.once('end', () => {
                        console.log('✅ Email parsing test completed');
                        imap.end();
                        resolve();
                    });
                } else {
                    console.log('📭 No emails found in INBOX');
                    imap.end();
                    resolve();
                }
            });
        });

        imap.once('error', (err) => {
            console.error('❌ IMAP connection error:', err);
            reject(err);
        });

        imap.connect();
    });
}

// Test Discord bot token
async function testDiscordToken() {
    console.log('🧪 Testing Discord bot token...');
    
    const { Client, GatewayIntentBits } = require('discord.js');
    
    const client = new Client({
        intents: [GatewayIntentBits.Guilds]
    });

    return new Promise((resolve, reject) => {
        client.once('ready', () => {
            console.log('✅ Discord bot token is valid!');
            console.log(`   Bot name: ${client.user.tag}`);
            console.log(`   Bot ID: ${client.user.id}`);
            client.destroy();
            resolve();
        });

        client.on('error', (error) => {
            console.error('❌ Discord bot error:', error);
            reject(error);
        });

        client.login(process.env.DISCORD_TOKEN).catch(reject);
    });
}

// Test Discord channel access
async function testDiscordChannel() {
    console.log('🧪 Testing Discord channel access...');
    
    const { Client, GatewayIntentBits } = require('discord.js');
    
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ]
    });

    return new Promise((resolve, reject) => {
        client.once('ready', async () => {
            try {
                const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
                
                if (!channel) {
                    console.error('❌ Channel not found or bot not in server');
                    client.destroy();
                    reject(new Error('Channel not found'));
                    return;
                }

                console.log('✅ Channel access successful!');
                console.log(`   Channel name: ${channel.name}`);
                console.log(`   Channel type: ${channel.type}`);
                console.log(`   Guild name: ${channel.guild.name}`);

                // Test sending a message
                try {
                    const testEmbed = {
                        color: 0x00FF00,
                        title: '🧪 Connection Test',
                        description: 'Discord Email Bot connection test successful!',
                        timestamp: new Date().toISOString(),
                        footer: {
                            text: 'Test completed'
                        }
                    };

                    await channel.send({ embeds: [testEmbed] });
                    console.log('✅ Test message sent successfully!');
                } catch (sendError) {
                    console.error('❌ Error sending test message:', sendError.message);
                }

                client.destroy();
                resolve();
            } catch (error) {
                console.error('❌ Error testing channel access:', error);
                client.destroy();
                reject(error);
            }
        });

        client.login(process.env.DISCORD_TOKEN).catch(reject);
    });
}

// Main test function
async function runTests() {
    console.log('🚀 Starting connection tests...\n');

    try {
        // Test Discord token
        await testDiscordToken();
        console.log('');

        // Test Discord channel
        await testDiscordChannel();
        console.log('');

        // Test IMAP connection
        await testImapConnection();
        console.log('');

        console.log('🎉 All tests passed! Bot should work correctly.');
        console.log('\n📝 Next steps:');
        console.log('1. Make sure your .env file is properly configured');
        console.log('2. Run "npm start" to start the bot');
        console.log('3. Check the console for any error messages');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('- Check your .env file configuration');
        console.log('- Verify Discord bot token and permissions');
        console.log('- Ensure Yahoo IMAP is enabled and app password is correct');
        console.log('- Make sure bot is invited to the Discord server');
        process.exit(1);
    }
}

// Check if .env file exists
const fs = require('fs');
if (!fs.existsSync('.env')) {
    console.error('❌ .env file not found!');
    console.log('Please copy .env.example to .env and configure it with your credentials.');
    process.exit(1);
}

// Run tests
runTests();


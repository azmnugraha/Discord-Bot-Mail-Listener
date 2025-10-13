require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

async function checkBotStatus() {
    console.log('🔍 Checking Discord Bot Status...\n');
    
    const client = new Client({
        intents: [GatewayIntentBits.Guilds]
    });

    try {
        await client.login(process.env.DISCORD_TOKEN);
        
        console.log('✅ Discord Bot Status: ONLINE');
        console.log(`   Bot Name: ${client.user.tag}`);
        console.log(`   Bot ID: ${client.user.id}`);
        console.log(`   Status: ${client.user.presence?.status || 'unknown'}`);
        
        // Check channel access
        await client.channels.fetch(process.env.DISCORD_CHANNEL_ID).then(channel => {
            if (channel) {
                console.log(`✅ Channel Access: OK`);
                console.log(`   Channel: #${channel.name}`);
                console.log(`   Guild: ${channel.guild.name}`);
            } else {
                console.log('❌ Channel Access: FAILED - Channel not found');
            }
        }).catch(error => {
            console.log('❌ Channel Access: FAILED');
            console.log(`   Error: ${error.message}`);
        });
        
        client.destroy();
        
    } catch (error) {
        console.log('❌ Discord Bot Status: OFFLINE');
        console.log(`   Error: ${error.message}`);
    }
}

checkBotStatus();

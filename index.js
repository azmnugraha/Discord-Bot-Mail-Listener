require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const EmailListener = require('./src/emailListener');
const ItemkuEmailParser = require('./src/itemkuEmailParser');

class DiscordEmailBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });

        this.emailListener = new EmailListener();
        this.itemkuParser = new ItemkuEmailParser();
        this.channelId = process.env.DISCORD_CHANNEL_ID;
        
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.client.once('ready', () => {
            console.log(`✅ Bot Discord siap! Logged in as ${this.client.user.tag}`);
            console.log(`📧 Memulai email listener untuk Yahoo Mail...`);
            this.startEmailMonitoring();
        });

        this.client.on('error', (error) => {
            console.error('❌ Discord Bot Error:', error);
        });

        // Handle interactions (dropdowns, buttons, and modals)
        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isStringSelectMenu() && !interaction.isButton() && !interaction.isModalSubmit()) return;

            try {
                if (interaction.isStringSelectMenu()) {
                    await this.handleAdminAssignment(interaction);
                } else if (interaction.isButton()) {
                    await this.handleButtonClick(interaction);
                } else if (interaction.isModalSubmit()) {
                    await this.handleModalSubmit(interaction);
                }
            } catch (error) {
                console.error('❌ Interaction error:', error);
                if (!interaction.replied) {
                    await interaction.reply({ content: '❌ Error processing interaction', ephemeral: true });
                }
            }
        });

        // Handle email events from email listener
        this.emailListener.on('newEmail', async (emailData) => {
            try {
                await this.sendEmailToDiscord(emailData);
            } catch (error) {
                console.error('❌ Error sending email to Discord:', error);
            }
        });

        this.emailListener.on('error', (error) => {
            console.error('❌ Email Listener Error:', error);
        });
    }

    async sendEmailToDiscord(emailData) {
        try {
            const channel = this.client.channels.cache.get(this.channelId);
            if (!channel) {
                console.error(`❌ Channel dengan ID ${this.channelId} tidak ditemukan!`);
                return;
            }

            const messageData = this.itemkuParser.createItemkuEmbed(emailData);
            
            // Send embed message with components
            await channel.send(messageData);
            
            console.log(`✅ Email dari ${emailData.from} berhasil dikirim ke Discord!`);
        } catch (error) {
            console.error('❌ Error sending email to Discord:', error);
        }
    }

    startEmailMonitoring() {
        this.emailListener.start();
    }

    async handleAdminAssignment(interaction) {
        const adminId = interaction.values[0];
        const emailUid = interaction.customId.split('_')[2];
        
        // Update embed to show assigned admin
        const originalEmbed = interaction.message.embeds[0];
        const updatedEmbed = new EmbedBuilder()
            .setColor(0x00FF00) // Green for assigned
            .setTitle('🛒 Itemku - Dagangan Dibeli! ✅ ASSIGNED')
            .setAuthor(originalEmbed.author)
            .setTimestamp()
            .setFooter(originalEmbed.footer);

        // Copy all fields and add assignment info
        originalEmbed.fields.forEach(field => {
            updatedEmbed.addFields(field);
        });

        updatedEmbed.addFields({
            name: '👤 Assigned to',
            value: `${adminId.toUpperCase()}`,
            inline: true
        });

        // Update the original message
        await interaction.update({ embeds: [updatedEmbed], components: [] });

        // Create or find admin channel
        const adminChannel = await this.getOrCreateAdminChannel(adminId, interaction.guild);
        
        // Send order to admin channel
        const adminEmbed = new EmbedBuilder()
            .setColor(0x7C3AED)
            .setTitle('📋 Order Assigned')
            .setDescription(`Pesanan telah di-assign ke ${adminId.toUpperCase()}`)
            .addFields({
                name: '📧 Original Email',
                value: `[View in #detail](https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${interaction.message.id})`,
                inline: false
            })
            .setTimestamp();

        // Copy order details
        originalEmbed.fields.forEach(field => {
            if (field.name !== '🔗 Tindakan') {
                adminEmbed.addFields(field);
            }
        });

        // Add hour input button and completion button
        const hourButton = new ButtonBuilder()
            .setCustomId(`input_hours_${emailUid}_${adminId}`)
            .setLabel('⏰ Input Hours')
            .setStyle(ButtonStyle.Secondary);

        const completeButton = new ButtonBuilder()
            .setCustomId(`complete_order_${emailUid}_${adminId}`)
            .setLabel('✅ Mark as Complete')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(hourButton, completeButton);

        await adminChannel.send({ embeds: [adminEmbed], components: [row] });

        // Update status monitoring
        await this.updateStatusMonitoring(interaction, adminId, originalEmbed, 'assigned');

        await interaction.followUp({ 
            content: `✅ Order assigned to ${adminId.toUpperCase()} and sent to ${adminChannel}`, 
            ephemeral: true 
        });
    }

    async handleButtonClick(interaction) {
        if (interaction.customId.startsWith('complete_order_')) {
            await this.handleOrderCompletion(interaction);
        } else if (interaction.customId.startsWith('input_hours_')) {
            await this.handleHourInput(interaction);
        }
    }

    async handleHourInput(interaction) {
        const [, , emailUid, adminId] = interaction.customId.split('_');
        
        // Create modal for hour input
        
        const modal = new ModalBuilder()
            .setCustomId(`hour_modal_${emailUid}_${adminId}`)
            .setTitle('Input Working Hours');

        const hoursInput = new TextInputBuilder()
            .setCustomId('hours_input')
            .setLabel('How many hours will you work?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter number of hours (e.g., 1, 2, 3)')
            .setRequired(true)
            .setMaxLength(2);

        const actionRow = new ActionRowBuilder().addComponents(hoursInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
    }

    async handleOrderCompletion(interaction) {
        const [, , emailUid, adminId] = interaction.customId.split('_');
        
        // Get current embed data
        const originalEmbed = interaction.message.embeds[0];
        const workingHours = this.extractWorkingHours(originalEmbed);
        
        // Update the message to show completed
        const completedEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Order Completed')
            .setDescription(`Order telah diselesaikan oleh ${adminId.toUpperCase()}`)
            .addFields({
                name: '👤 Completed by',
                value: interaction.user.toString(),
                inline: true
            }, {
                name: '⏰ Completed at',
                value: new Date().toLocaleString('id-ID'),
                inline: true
            })
            .setTimestamp();

        // Copy all original fields
        originalEmbed.fields.forEach(field => {
            completedEmbed.addFields(field);
        });

        // Delete the message instead of updating it
        await interaction.message.delete();

        // Update status monitoring channel
        await this.updateStatusMonitoring(interaction, adminId, originalEmbed, 'completed');

        // Create work summary in summary channel
        await this.createDailyWorkSummary(interaction, adminId, originalEmbed);
    }

    async handleModalSubmit(interaction) {
        if (interaction.customId.startsWith('hour_modal_')) {
            await this.handleHourModalSubmit(interaction);
        }
    }

    async handleHourModalSubmit(interaction) {
        const [, , emailUid, adminId] = interaction.customId.split('_');
        const hours = interaction.fields.getTextInputValue('hours_input');
        
        // Validate hours input
        const hoursNum = parseInt(hours);
        if (isNaN(hoursNum) || hoursNum < 1 || hoursNum > 24) {
            await interaction.reply({ 
                content: '❌ Invalid hours input. Please enter a number between 1-24.', 
                ephemeral: true 
            });
            return;
        }

        // Calculate completion time
        const startTime = new Date();
        const completionTime = new Date(startTime.getTime() + (hoursNum * 60 * 60 * 1000));

        // Update the original message with hours info
        const originalEmbed = interaction.message.embeds[0];
        const updatedEmbed = new EmbedBuilder()
            .setColor(0x7C3AED)
            .setTitle('📋 Order Assigned - Working')
            .setDescription(`Pesanan telah di-assign ke ${adminId.toUpperCase()}`)
            .setTimestamp();

        // Copy all original fields
        originalEmbed.fields.forEach(field => {
            updatedEmbed.addFields(field);
        });

        // Add working hours info
        updatedEmbed.addFields({
            name: '⏰ Working Hours',
            value: `${hoursNum} jam`,
            inline: true
        }, {
            name: '🕐 Expected Completion',
            value: completionTime.toLocaleString('id-ID'),
            inline: true
        });

        // Update the message
        await interaction.update({ embeds: [updatedEmbed] });

        // Update status monitoring
        await this.updateStatusMonitoring(interaction, adminId, updatedEmbed, 'working');

        await interaction.followUp({ 
            content: `✅ Working hours set: ${hoursNum} jam. Expected completion: ${completionTime.toLocaleString('id-ID')}`, 
            ephemeral: true 
        });
    }

    extractWorkingHours(embed) {
        const hoursField = embed.fields.find(field => field.name === '⏰ Working Hours');
        return hoursField ? hoursField.value : null;
    }

    async getOrCreateAdminChannel(adminId, guild) {
        const channelName = `${adminId.toLowerCase()}-orders`;
        
        // Try to find existing channel
        let adminChannel = guild.channels.cache.find(channel => 
            channel.name === channelName && channel.type === 0
        );

        if (!adminChannel) {
            // Create new channel
            adminChannel = await guild.channels.create({
                name: channelName,
                type: 0,
                topic: `Orders assigned to ${adminId.toUpperCase()}`,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: ['ViewChannel']
                    }
                ]
            });
            console.log(`✅ Created new channel: #${channelName}`);
        }

        return adminChannel;
    }

    async createWorkSummary(interaction, adminId, originalEmbed) {
        const guild = interaction.guild;
        const summaryChannelName = `${adminId.toLowerCase()}-summary`;
        
        // Try to find existing summary channel
        let summaryChannel = guild.channels.cache.find(channel => 
            channel.name === summaryChannelName && channel.type === 0
        );

        if (!summaryChannel) {
            // Create new summary channel
            summaryChannel = await guild.channels.create({
                name: summaryChannelName,
                type: 0,
                topic: `Work summary for ${adminId.toUpperCase()}`,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: ['ViewChannel']
                    }
                ]
            });
            console.log(`✅ Created new summary channel: #${summaryChannelName}`);
        }

        // Create work summary embed
        const summaryEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('📊 Work Summary')
            .setDescription(`Order completed by ${adminId.toUpperCase()}`)
            .addFields(
                {
                    name: '👤 Admin',
                    value: `${adminId.toUpperCase()}`,
                    inline: true
                },
                {
                    name: '⏰ Completed',
                    value: new Date().toLocaleString('id-ID'),
                    inline: true
                },
                {
                    name: '👤 Completed by',
                    value: interaction.user.toString(),
                    inline: true
                }
            )
            .setTimestamp();

        // Copy relevant order details
        originalEmbed.fields.forEach(field => {
            if (['📋 Nomor Pesanan', '👤 Pembeli', '🎮 Produk', '💰 Harga'].includes(field.name)) {
                summaryEmbed.addFields(field);
            }
        });

        await summaryChannel.send({ embeds: [summaryEmbed] });
    }

    async updateStatusMonitoring(interaction, adminId, embed, status) {
        const guild = interaction.guild;
        const statusChannelName = 'admin-status-monitor';
        
        // Get or create status monitoring channel
        let statusChannel = guild.channels.cache.find(channel => 
            channel.name === statusChannelName && channel.type === 0
        );

        if (!statusChannel) {
            statusChannel = await guild.channels.create({
                name: statusChannelName,
                type: 0,
                topic: 'Real-time monitoring of all admin work status',
                permissionOverwrites: [] // Public channel
            });
            console.log(`✅ Created status monitoring channel: #${statusChannelName}`);
        }

        // Get admin channel to count active orders
        const adminChannelName = `${adminId.toLowerCase()}-orders`;
        const adminChannel = guild.channels.cache.find(channel => 
            channel.name === adminChannelName && channel.type === 0
        );

        let activeOrdersCount = 0;
        if (adminChannel) {
            // Count messages with embeds in admin channel
            const messages = await adminChannel.messages.fetch({ limit: 100 });
            activeOrdersCount = messages.filter(msg => 
                msg.embeds.length > 0 && 
                !msg.embeds[0].title?.includes('Order Completed')
            ).size;
        }

        // Try to find existing embed for this admin
        const messages = await statusChannel.messages.fetch({ limit: 50 });
        const existingMessage = messages.find(msg => 
            msg.embeds[0]?.fields?.find(f => f.name === '👤 Admin' && f.value === adminId.toUpperCase())
        );

        // Create status embed
        const statusEmbed = new EmbedBuilder()
            .setColor(0x7C3AED)
            .setTitle(`📊 ${adminId.toUpperCase()} Status`)
            .setDescription(`Status monitoring for ${adminId.toUpperCase()}`)
            .addFields({
                name: '👤 Admin',
                value: adminId.toUpperCase(),
                inline: true
            }, {
                name: '📋 Active Orders',
                value: activeOrdersCount.toString(),
                inline: true
            }, {
                name: '📁 Channel',
                value: adminChannel ? `#${adminChannelName}` : 'Not found',
                inline: true
            }, {
                name: '⏰ Last Update',
                value: new Date().toLocaleString('id-ID'),
                inline: true
            })
            .setTimestamp();

        if (existingMessage) {
            // Update existing embed
            await existingMessage.edit({ embeds: [statusEmbed] });
        } else {
            // Send new status embed
            await statusChannel.send({ embeds: [statusEmbed] });
        }
    }

    async createDailyWorkSummary(interaction, adminId, embed) {
        const guild = interaction.guild;
        const summaryChannelName = `${adminId.toLowerCase()}-summary`;
        
        // Get or create summary channel
        let summaryChannel = guild.channels.cache.find(channel => 
            channel.name === summaryChannelName && channel.type === 0
        );

        if (!summaryChannel) {
            summaryChannel = await guild.channels.create({
                name: summaryChannelName,
                type: 0,
                topic: `Work summary for ${adminId.toUpperCase()}`,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: ['ViewChannel']
                    }
                ]
            });
            console.log(`✅ Created summary channel: #${summaryChannelName}`);
        }

        // Get today's date
        const today = new Date().toLocaleDateString('id-ID');
        
        // Try to find today's summary message
        const messages = await summaryChannel.messages.fetch({ limit: 50 });
        const todayMessage = messages.find(msg => 
            msg.embeds[0]?.title?.includes('Daily Summary') && 
            msg.embeds[0]?.fields?.find(f => f.name === '📅 Date' && f.value === today)
        );

        // Get order details
        const orderNumber = embed.fields.find(f => f.name === '📋 Nomor Pesanan')?.value || 'Unknown';
        const buyer = embed.fields.find(f => f.name === '👤 Pembeli')?.value || 'Unknown';
        const product = embed.fields.find(f => f.name === '🎮 Produk')?.value || 'Unknown';
        const workingHours = embed.fields.find(f => f.name === '⏰ Working Hours')?.value || 'Not set';

        if (todayMessage) {
            // Update existing daily summary
            const existingEmbed = todayMessage.embeds[0];
            const updatedEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('📊 Daily Work Summary')
                .setDescription(`Work completed by ${adminId.toUpperCase()} on ${today}`)
                .addFields(existingEmbed.fields);

            // Add new order to summary
            updatedEmbed.addFields({
                name: `✅ ${orderNumber}`,
                value: `👤 ${buyer}\n🎮 ${product}\n⏰ ${workingHours}`,
                inline: true
            });

            await todayMessage.edit({ embeds: [updatedEmbed] });
        } else {
            // Create new daily summary
            const summaryEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('📊 Daily Work Summary')
                .setDescription(`Work completed by ${adminId.toUpperCase()} on ${today}`)
                .addFields({
                    name: '📅 Date',
                    value: today,
                    inline: true
                }, {
                    name: '👤 Admin',
                    value: adminId.toUpperCase(),
                    inline: true
                }, {
                    name: `✅ ${orderNumber}`,
                    value: `👤 ${buyer}\n🎮 ${product}\n⏰ ${workingHours}`,
                    inline: true
                })
                .setTimestamp();

            await summaryChannel.send({ embeds: [summaryEmbed] });
        }
    }

    async login() {
        try {
            await this.client.login(process.env.DISCORD_TOKEN);
        } catch (error) {
            console.error('❌ Error logging in to Discord:', error);
            process.exit(1);
        }
    }
}

// Start the bot
const bot = new DiscordEmailBot();
bot.login();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down bot...');
    bot.emailListener.stop();
    bot.client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down bot...');
    bot.emailListener.stop();
    bot.client.destroy();
    process.exit(0);
});


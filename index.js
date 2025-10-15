require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField } = require('discord.js');
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
        
        // safe bind helper: only bind if method exists
        const _tryBind = (name) => {
            if (typeof this[name] === 'function') {
                this[name] = this[name].bind(this);
            }
        };

        _tryBind('handleAdminAssignment');
        _tryBind('handleButtonClick');
        _tryBind('handleModalSubmit');
        _tryBind('updateStatusMonitoring');
        _tryBind('createDailyWorkSummary');
        _tryBind('createWorkSummary');
        _tryBind('updatePresence');
        _tryBind('handleSlashCommand');

        this.setupEventHandlers();
        this.initStorage();
    }

    // Storage helpers (JSON)
    initStorage() {
        const dataDir = require('path').join(__dirname, 'data');
        const fs = require('fs');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        this._dataDir = dataDir;

        // ensure files
        const files = {
            admins: 'admins.json',
            entries: 'entries.json',
            state: 'state.json'
        };

        for (const k in files) {
            const p = require('path').join(dataDir, files[k]);
            if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify(k === 'admins' ? [] : k === 'entries' ? [] : { paused: false }, null, 2));
        }
    }

    _readJson(name) {
        const fs = require('fs');
        const p = require('path').join(this._dataDir, name);
        try {
            const raw = fs.readFileSync(p, 'utf8');
            return JSON.parse(raw || '{}');
        } catch (e) {
            return null;
        }
    }

    _writeJson(name, data) {
        const fs = require('fs');
        const p = require('path').join(this._dataDir, name);
        fs.writeFileSync(p, JSON.stringify(data, null, 2));
    }

    addAdmin(userId, displayName) {
        // Store admin as an object { id, name }
        const admins = this._readJson('admins.json') || [];
        const id = String(userId).replace(/[<@!>]/g, '');
        const existing = admins.find(a => String(a.id) === String(id));
        if (existing) {
            // update name if provided and different
            if (displayName && existing.name !== displayName) {
                existing.name = displayName;
                this._writeJson('admins.json', admins);
                return true;
            }
            return false;
        }
        admins.push({ id, name: displayName || id });
        this._writeJson('admins.json', admins);
        return true;
    }

    removeAdmin(userId) {
        const admins = this._readJson('admins.json') || [];
        const id = String(userId).replace(/[<@!>]/g, '');
        const idx = admins.findIndex(a => String(a.id) === String(id));
        if (idx !== -1) {
            admins.splice(idx, 1);
            this._writeJson('admins.json', admins);
            return true;
        }
        return false;
    }

    listAdmins() {
        // returns array of { id, name }
        const raw = this._readJson('admins.json') || [];
        // normalize old format (array of ids) to objects
        return raw.map(r => {
            if (typeof r === 'string') return { id: r, name: r };
            return { id: r.id, name: r.name || r.id };
        });
     }

     // helper: get admin record by id (string)
     getAdminRecord(adminId) {
         const admins = this.listAdmins() || [];
         return admins.find(a => String(a.id) === String(adminId)) || null;
     }

     async getAdminDisplayName(adminId, guild) {
         // Prefer stored name, else try to resolve guild member username, else fallback to id
         const rec = this.getAdminRecord(adminId);
         if (rec && rec.name) return rec.name;
        if (guild && /^\d+$/.test(String(adminId))) {
            // try to fetch member (may be rate-limited) as fallback
            const member = await guild.members.fetch(adminId).catch(() => null);
            if (member && member.user && member.user.username) return member.user.username;
        }
         return String(adminId);
     }

    addEntry(entry) {
        const entries = this._readJson('entries.json') || [];
        entries.push(entry);
        this._writeJson('entries.json', entries);
    }

    getTotals(adminId) {
        const entries = this._readJson('entries.json') || [];
        const filtered = entries.filter(e => e.adminId === adminId);
        const total = filtered.reduce((s, e) => s + (Number(e.hours) || 0), 0);
        return { total, entries: filtered };
    }

    backupData() {
        const fs = require('fs');
        const path = require('path');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(this._dataDir, 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const files = ['admins.json', 'entries.json', 'state.json'];
        files.forEach(f => fs.copyFileSync(path.join(this._dataDir, f), path.join(backupDir, `${timestamp}_${f}`)));
        return path.join(backupDir, `${timestamp}`);
    }

    restoreLatestBackup() {
        const fs = require('fs');
        const path = require('path');
        const backupDir = path.join(this._dataDir, 'backups');
        if (!fs.existsSync(backupDir)) return false;
        const files = fs.readdirSync(backupDir).sort().reverse();
        if (!files.length) return false;
        // take latest group by timestamp prefix
        const latestPrefix = files[0].split('_').slice(0, 1)[0];
        const latestFiles = files.filter(f => f.startsWith(latestPrefix));
        latestFiles.forEach(f => {
            const origName = f.split('_').slice(1).join('_');
            fs.copyFileSync(path.join(backupDir, f), path.join(this._dataDir, origName));
        });
        return true;
    }

    pauseEmailMonitoring() {
        this.emailListener.stop();
        const state = this._readJson('state.json') || {};
        state.paused = true;
        this._writeJson('state.json', state);
    }

    resumeEmailMonitoring() {
        this.emailListener.start();
        const state = this._readJson('state.json') || {};
        state.paused = false;
        this._writeJson('state.json', state);
    }

    setupEventHandlers() {
        this.client.once('ready', () => {
            console.log(`✅ Bot Discord siap! Logged in as ${this.client.user.tag}`);
            console.log(`📧 Memulai email listener untuk Yahoo Mail...`);
            this.startEmailMonitoring();

            // Set initial presence and refresh periodically
            try { this.updatePresence(); } catch (e) { /* ignore */ }
            setInterval(() => { try { this.updatePresence(); } catch (e) { /* ignore */ } }, 5 * 60 * 1000);
        });

        this.client.on('error', (error) => {
            console.error('❌ Discord Bot Error:', error);
        });

        // Handle interactions (dropdowns, buttons, and modals)
        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isStringSelectMenu() && !interaction.isButton() && !interaction.isModalSubmit() && !interaction.isChatInputCommand()) return;

            try {
                if (interaction.isStringSelectMenu()) {
                    await this.handleAdminAssignment(interaction);
                } else if (interaction.isButton()) {
                    await this.handleButtonClick(interaction);
                } else if (interaction.isModalSubmit()) {
                    await this.handleModalSubmit(interaction);
                } else if (interaction.isChatInputCommand && interaction.isChatInputCommand()) {
                    await this.handleSlashCommand(interaction);
                }
            } catch (error) {
                console.error('❌ Interaction error:', error);
                if (!interaction.replied) {
                    await interaction.reply({ content: '❌ Error processing interaction', ephemeral: true });
                }
            }
        });

        // Message command: extended commands (ping, admins, totals, backup, pause/resume, etc.)
        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;

            const content = message.content.trim();
            const parts = content.split(/\s+/);
            const cmd = parts[0].toLowerCase();

            // /ping
            if (cmd === '/ping' || cmd === '!ping') {
                const sent = await message.channel.send('🏓 Pong...');
                const latency = sent.createdTimestamp - message.createdTimestamp;
                await sent.edit(`🏓 Pong! Latency: ${latency}ms`);
                return;
            }

            // /admins add|remove <userId>
            if (cmd === 'admins') {
                try {
                    const sub = interaction.options.getSubcommand();
                    if (sub === 'add') {
                        const user = interaction.options.getUser('user');
                        if (!user) return interaction.reply({ content: 'Usage: /admins add <user>', ephemeral: true });
                        const name = interaction.options.getString('name') || null;
                        const ok = this.addAdmin(user.id, name);
                        await interaction.reply({ content: ok ? `✅ Added admin ${name || `<@${user.id}>`}` : `ℹ️ Admin already exists`, ephemeral: true });
                        return;
                    }
                    if (sub === 'remove') {
                        const user = interaction.options.getUser('user');
                        if (!user) return interaction.reply({ content: 'Usage: /admins remove <user>', ephemeral: true });
                        const ok = this.removeAdmin(user.id);
                        await interaction.reply({ content: ok ? `✅ Removed admin <@${user.id}>` : `ℹ️ <@${user.id}> not found`, ephemeral: true });
                        return;
                    }
                    if (sub === 'list') {
                        const list = this.listAdmins();
                        if (!list || !list.length) {
                            await interaction.reply({ content: 'No admins configured.', ephemeral: true });
                        } else {
                            const mentionList = list.map(a => `${a.name} (<@${a.id}>)`).join('\n');
                            await interaction.reply({ content: `Configured admins:\n${mentionList}`, ephemeral: true });
                        }
                        return;
                    }
                } catch (e) {
                    console.error('❌ Error handling /admins command:', e);
                    await interaction.reply({ content: '❌ Error processing command', ephemeral: true });
                }
            }

            // /totals <adminId>
            if (cmd === '/totals' || cmd === '!totals') {
                const adminId = parts[1];
                if (!adminId) { await message.reply('Usage: /totals <adminId>'); return; }
                const res = this.getTotals(adminId);
                const embed = new EmbedBuilder().setTitle(`Totals for ${adminId.toUpperCase()}`).addFields({ name: 'Total Hours', value: `${res.total} jam`, inline: true });
                await message.channel.send({ embeds: [embed] });
                return;
            }

            // /backup
            if (cmd === '/backup' || cmd === '!backup') {
                const path = this.backupData();
                await message.reply(`✅ Backup created at ${path}`);
                return;
            }

            // /restore
            if (cmd === '/restore' || cmd === '!restore') {
                const ok = this.restoreLatestBackup();
                await message.reply(ok ? '✅ Restored latest backup' : '❌ No backup found');
                return;
            }

            // /pause-email and /resume-email
            if (cmd === '/pause-email' || cmd === '!pause-email') {
                this.pauseEmailMonitoring();
                await message.reply('⏸️ Email monitoring paused');
                return;
            }
            if (cmd === '/resume-email' || cmd === '!resume-email') {
                this.resumeEmailMonitoring();
                await message.reply('▶️ Email monitoring resumed');
                return;
            }

            // /cleanup-old <days>
            if (cmd === '/cleanup-old' || cmd === '!cleanup-old') {
                const days = parseInt(parts[1], 10) || 30;
                const entries = this._readJson('entries.json') || [];
                const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
                const kept = entries.filter(e => new Date(e.timestamp).getTime() >= cutoff);
                this._writeJson('entries.json', kept);
                await message.reply(`✅ Cleanup done. Removed ${entries.length - kept.length} entries older than ${days} days`);
                return;
            }

            // /sync-messages <channelId> (placeholder)
            if (cmd === '/sync-messages' || cmd === '!sync-messages') {
                const channelId = parts[1];
                if (!channelId) { await message.reply('Usage: /sync-messages <channelId>'); return; }
                await message.reply('🔁 Sync started (placeholder)');
                // implement per-project sync logic when needed
                return;
            }

            // Keep existing help/purge handling
            if (content === '/help' || content === '!help') {
                const helpEmbed = new EmbedBuilder()
                    .setColor(0x60A5FA)
                    .setTitle('MiShop Listener — Help')
                    .setDescription('Ringkasan fungsi bot dan perintah yang tersedia')
                    .addFields(
                        { name: '📌 Fungsi Utama', value: 'Memantau email Itemku, kirim notifikasi ke #detail, assign ke admin, input jam kerja, buat summary dan monitor status', inline: false },
                        { name: '🛠️ Perintah Pesan (message)', value: '/help, !help — Tampilkan bantuan singkat\n/purge N, !purge N — Hapus N pesan (butuh Manage Messages)\n/ping — Cek bot\n/admins add|remove <userId> — Kelola admin\n/totals <adminId> — Total jam', inline: false },
                        { name: '🔁 Alur Interaktif', value: '1) Pesanan masuk di #detail → pilih admin\n2) Di #<admin>-orders tekan ⏰ Input Hours → isi jam\n3) Tekan ✅ Mark as Complete untuk menyelesaikan dan menambahkan ke summary', inline: false },
                        { name: 'ℹ️ Catatan', value: 'Beberapa fitur menggunakan interaction (dropdown, tombol, modal). Pastikan bot punya permission yang diperlukan.', inline: false }
                    )
                    .setTimestamp();

                try {
                    const replyMsg = await message.channel.send({ embeds: [helpEmbed] });
                    // auto-delete help message after 30s to reduce channel noise
                    setTimeout(() => replyMsg.delete().catch(() => {}), 30000);
                } catch (e) {
                    // ignore
                }

                return;
            }

            if (!content.startsWith('/purge') && !content.startsWith('!purge')) return;

            // Permission check
            if (!message.member || !message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                await message.reply({ content: '❌ You need the Manage Messages permission to use this command.', ephemeral: true }).catch(() => {});
                return;
            }

            const parts2 = content.split(/\s+/);
            const num = parseInt(parts2[1], 10);
            if (isNaN(num) || num < 1 || num > 100) {
                await message.reply({ content: '❌ Usage: /purge <1-100>', ephemeral: true }).catch(() => {});
                return;
            }

            try {
                // bulkDelete cannot delete messages older than 14 days; include the command message in the count
                const deleteCount = Math.min(100, num + 1);
                const deleted = await message.channel.bulkDelete(deleteCount, true);
                const replyMsg = await message.channel.send(`✅ Purged ${deleted.size} messages.`);
                setTimeout(() => replyMsg.delete().catch(() => {}), 5000);
            } catch (err) {
                console.error('❌ Purge error:', err);
                await message.reply({ content: '❌ Failed to purge messages. Messages older than 14 days cannot be bulk deleted.', ephemeral: true }).catch(() => {});
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

            // Build dynamic admin select menu using configured admins and guild information
            const admins = this.listAdmins();
             const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
             let components = [];
             try {
                 const select = new StringSelectMenuBuilder().setCustomId(`assign_admin_${emailData.uid}`).setPlaceholder('👤 Assign ke Admin...');
                 const options = [];
                 // Resolve admin IDs to user display names where possible (requires guild)
                 const guild = channel.guild;
                for (const a of (admins || [])) {
                    const id = String(a.id);
                    let label = a.name || id;
                    try {
                        const member = await guild.members.fetch(id).catch(() => null);
                        if (member && member.user) label = member.user.username;
                    } catch (e) { /* ignore */ }
                    options.push({ label: String(label).slice(0, 100), value: String(id), description: `Assign pesanan ke ${label}` });
                    if (options.length >= 25) break;
                }
                 if (options.length === 0) {
                    options.push({ label: 'Admin 1', value: 'admin1', description: 'Fallback admin 1' });
                    options.push({ label: 'Admin 2', value: 'admin2', description: 'Fallback admin 2' });
                 }
                 select.addOptions(options);
                 components = [new ActionRowBuilder().addComponents(select)];

             } catch (e) {
                 console.error('❌ Failed to build admin select menu:', e);
             }

             // Send embed message with components
             await channel.send({ ...messageData, components });

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
        const displayName = (await this.getAdminDisplayName(adminId, interaction.guild)) || adminId;
         
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
            value: `${displayName}`,
            inline: true
        });

        // Create or find admin channel first
        const adminChannel = await this.getOrCreateAdminChannel(adminId, interaction.guild);
        
        // Send order to admin channel and capture the message
        const adminEmbed = new EmbedBuilder()
            .setColor(0x7C3AED)
            .setTitle('📋 Order Assigned')
            .setDescription(`Pesanan telah di-assign ke ${displayName}`)
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

        const hourButton = new ButtonBuilder()
            .setCustomId(`input_hours_${emailUid}_${adminId}`)
            .setLabel('⏰ Input Hours')
            .setStyle(ButtonStyle.Secondary);

        const completeButton = new ButtonBuilder()
            .setCustomId(`complete_order_${emailUid}_${adminId}`)
            .setLabel('✅ Mark as Complete')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(hourButton, completeButton);

        const adminMessage = await adminChannel.send({ embeds: [adminEmbed], components: [row] });

        // Add direct link to admin message inside the original embed in detail channel
        const adminMessageLink = `https://discord.com/channels/${interaction.guild.id}/${adminChannel.id}/${adminMessage.id}`;
        updatedEmbed.addFields({
            name: '🔗 Admin Message',
            value: `[Open Admin Order](${adminMessageLink})`,
            inline: false
        });

        // Update the original message in detail channel (remove components)
        await interaction.update({ embeds: [updatedEmbed], components: [] });

        // Update status monitoring
        await this.updateStatusMonitoring(interaction, adminId, originalEmbed, 'assigned');

        await interaction.followUp({ 
            content: `✅ Order assigned to ${displayName} and sent to ${adminChannel}`, 
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

        // Persist the completed work into entries.json so totals are reliable
        try {
            const orderNumber = originalEmbed.fields.find(f => f.name === '📋 Nomor Pesanan')?.value || `uid_${emailUid}`;
            const hoursNum = Number(workingHours) || 0;
            this.addEntry({
                adminId,
                orderNumber,
                hours: hoursNum,
                timestamp: new Date().toISOString(),
                completedBy: interaction.user.id,
                emailUid
            });
            console.log(`✅ Persisted entry for ${adminId} order ${orderNumber} (${hoursNum} jam)`);
        } catch (e) {
            console.error('❌ Failed to persist entry:', e);
        }

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

    // Handle incoming slash (chat input) commands
    async handleSlashCommand(interaction) {
        const cmd = interaction.commandName;
        try {
            if (cmd === 'ping') {
                await interaction.reply({ content: '🏓 Pong!', ephemeral: true });
                return;
            }

            // /admins add|remove|list
            if (cmd === 'admins') {
                try {
                    const sub = interaction.options.getSubcommand();
                    if (sub === 'add') {
                        const user = interaction.options.getUser('user');
                        if (!user) return interaction.reply({ content: 'Usage: /admins add <user>', ephemeral: true });
                        const name = interaction.options.getString('name') || null;
                        const ok = this.addAdmin(user.id, name);
                        await interaction.reply({ content: ok ? `✅ Added admin ${name || `<@${user.id}>`}` : `ℹ️ Admin already exists`, ephemeral: true });
                        return;
                    }
                    if (sub === 'remove') {
                        const user = interaction.options.getUser('user');
                        if (!user) return interaction.reply({ content: 'Usage: /admins remove <user>', ephemeral: true });
                        const ok = this.removeAdmin(user.id);
                        await interaction.reply({ content: ok ? `✅ Removed admin <@${user.id}>` : `ℹ️ <@${user.id}> not found`, ephemeral: true });
                        return;
                    }
                } catch (e) {
                    // if no subcommand provided, show list
                    const list = this.listAdmins();
                    if (!list || !list.length) {
                        await interaction.reply({ content: 'No admins configured.', ephemeral: true });
                    } else {
                        const mentionList = list.map(a => `${a.name} (<@${a.id}>)`).join('\n');
                        await interaction.reply({ content: `Configured admins:\n${mentionList}`, ephemeral: true });
                    }
                    return;
                }
            }

            if (cmd === 'totals') {
                const adminId = interaction.options.getString('adminid');
                if (!adminId) return interaction.reply({ content: 'Usage: /totals <adminid>', ephemeral: true });
                const res = this.getTotals(adminId);
                const embed = new EmbedBuilder().setTitle(`Totals for ${adminId.toUpperCase()}`).addFields({ name: 'Total Hours', value: `${res.total} jam`, inline: true });
                await interaction.reply({ embeds: [embed] });
                return;
            }

            if (cmd === 'backup') {
                const path = this.backupData();
                await interaction.reply({ content: `✅ Backup created at ${path}`, ephemeral: true });
                return;
            }

            if (cmd === 'restore') {
                const ok = this.restoreLatestBackup();
                await interaction.reply({ content: ok ? '✅ Restored latest backup' : '❌ No backup found', ephemeral: true });
                return;
            }

            if (cmd === 'pause_email') {
                this.pauseEmailMonitoring();
                await interaction.reply({ content: '⏸️ Email monitoring paused', ephemeral: true });
                return;
            }
            if (cmd === 'resume_email') {
                this.resumeEmailMonitoring();
                await interaction.reply({ content: '▶️ Email monitoring resumed', ephemeral: true });
                return;
            }

            if (cmd === 'cleanup_old') {
                const days = interaction.options.getInteger('days') || 30;
                const entries = this._readJson('entries.json') || [];
                const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
                const kept = entries.filter(e => new Date(e.timestamp).getTime() >= cutoff);
                this._writeJson('entries.json', kept);
                await interaction.reply({ content: `✅ Cleanup done. Removed ${entries.length - kept.length} entries older than ${days} days`, ephemeral: true });
                return;
            }

            if (cmd === 'purge') {
                const count = interaction.options.getInteger('count');
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                    await interaction.reply({ content: '❌ You need the Manage Messages permission to use this command.', ephemeral: true });
                    return;
                }
                if (isNaN(count) || count < 1 || count > 100) {
                    await interaction.reply({ content: '❌ Count must be between 1 and 100', ephemeral: true });
                    return;
                }
                try {
                    const deleted = await interaction.channel.bulkDelete(Math.min(100, count), true);
                    await interaction.reply({ content: `✅ Purged ${deleted.size} messages.`, ephemeral: true });
                } catch (err) {
                    await interaction.reply({ content: '❌ Failed to purge messages. Messages older than 14 days cannot be bulk deleted.', ephemeral: true });
                }
                return;
            }

            await interaction.reply({ content: 'Unknown command', ephemeral: true });
        } catch (err) {
            console.error('❌ Slash command error:', err);
            if (!interaction.replied) await interaction.reply({ content: '❌ Error processing command', ephemeral: true });
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
        if (!hoursField) return null;
        const text = String(hoursField.value || '').trim();
        const m = text.match(/(\d+)\s*jam/i);
        if (m) return parseInt(m[1], 10);
        const num = Number(text);
        return isNaN(num) ? null : num;
    }

    async getOrCreateAdminChannel(adminId, guild) {
        // Derive a canonical channel name for this admin (try username if adminId is a user id)
        const channelName = await this.getAdminChannelName(adminId, guild);
        
        // Try to find existing channel by name or topic
        let adminChannel = guild.channels.cache.find(channel =>
            (channel.name === channelName || (channel.topic && channel.topic.includes(`Orders assigned to ${adminId}`))) && channel.type === 0
        );

        if (!adminChannel) {
            // Build permission overwrites: hide from @everyone, allow the admin (if resolvable) and keep bot access
            const overwrites = [];
            try {
                overwrites.push({ id: guild.roles.everyone.id || guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] });
            } catch (e) {
                overwrites.push({ id: guild.roles.everyone, deny: ['ViewChannel'] });
            }

            // If adminId looks like a Discord user id, allow that user to view
            if (/^\d+$/.test(String(adminId))) {
                try {
                    const member = await guild.members.fetch(adminId).catch(() => null);
                    if (member) overwrites.push({ id: member.id, allow: [PermissionsBitField.Flags.ViewChannel] });
                } catch (e) { /* ignore */ }
            }

            adminChannel = await guild.channels.create({
                name: channelName,
                type: 0,
                topic: `Orders assigned to ${adminId.toUpperCase()}`,
                permissionOverwrites: overwrites
            });
            console.log(`✅ Created new channel: #${channelName}`);
        }

        return adminChannel;
    }
    
    // Resolve canonical admin channel name. Uses guild member username when adminId is a user id.
    async getAdminChannelName(adminId, guild) {
        try {
            if (!adminId) return 'unknown-orders';
            // Prefer stored admin name if available
            const rec = this.getAdminRecord(adminId);
            if (rec && rec.name) {
                const slug = String(rec.name).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
                return `${slug}-orders`;
            }
             // If adminId is numeric, attempt to resolve guild member
             if (/^\d+$/.test(String(adminId)) && guild) {
                 const member = await guild.members.fetch(adminId).catch(() => null);
                 if (member && member.user && member.user.username) {
                     const slug = String(member.user.username).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
                     return `${slug}-orders`;
                 }
             }

             // fallback: use adminId string directly
             const slug2 = String(adminId).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
             return `${slug2}-orders`;
         } catch (e) {
             return `${String(adminId).toLowerCase()}-orders`;
         }
     }

    // Return canonical summary channel for admin
    async getAdminSummaryName(adminId, guild) {
        try {
            if (!adminId) return 'unknown-summary';
            // Prefer stored admin name
            const rec = this.getAdminRecord(adminId);
            if (rec && rec.name) {
                const slug = String(rec.name).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
                return `${slug}-summary`;
            }
            if (/^\d+$/.test(String(adminId)) && guild) {
                const member = await guild.members.fetch(adminId).catch(() => null);
                if (member && member.user && member.user.username) {
                    const slug = String(member.user.username).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
                    return `${slug}-summary`;
                }
            }
            const slug2 = String(adminId).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
            return `${slug2}-summary`;
        } catch (e) {
            return `${String(adminId).toLowerCase()}-summary`;
        }
    }

    async createWorkSummary(interaction, adminId, originalEmbed) {
        const guild = interaction.guild;
        // Use canonical summary channel name (prefer stored admin name)
        const summaryChannelName = await this.getAdminSummaryName(adminId, guild);
        let summaryChannel = guild.channels.cache.find(channel => channel.name === summaryChannelName && channel.type === 0);
        if (!summaryChannel) {
            // Create new summary channel only if it truly does not exist
            summaryChannel = await guild.channels.create({
                name: summaryChannelName,
                type: 0,
                topic: `Work summary for ${await this.getAdminDisplayName(adminId, guild)}`,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: [PermissionsBitField.Flags.ViewChannel]
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
            if (['📋 Nomor Pesanan', '👤 Pembeli', '🎮 Produk', '💰 Harga', '⏰ Working Hours'].includes(field.name)) {
                summaryEmbed.addFields(field);
            }
        });

        await summaryChannel.send({ embeds: [summaryEmbed] });

        // Update sticky total-hours embed in summary channel
        await this.updateAdminTotalHoursSummary(adminId, summaryChannel);
    }

    async createDailyWorkSummary(interaction, adminId, embed) {
        const guild = interaction.guild;
        // use canonical summary channel name
        const summaryChannelName = await this.getAdminSummaryName(adminId, guild);
        
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

        // Always append a new daily summary embed to preserve history
        const today = new Date().toLocaleDateString('id-ID');

        // Get order details
        const orderNumber = embed.fields.find(f => f.name === '📋 Nomor Pesanan')?.value || 'Unknown';
        const buyer = embed.fields.find(f => f.name === '👤 Pembeli')?.value || 'Unknown';
        const product = embed.fields.find(f => f.name === '🎮 Produk')?.value || 'Unknown';
        const workingHours = embed.fields.find(f => f.name === '⏰ Working Hours')?.value || 'Not set';

        const adminDisplay = await this.getAdminDisplayName(adminId, guild);

        const summaryEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('📊 Daily Work Summary')
            .setDescription(`Work completed by ${adminDisplay} on ${today}`)
            .addFields(
                {
                    name: '📅 Date',
                    value: today,
                    inline: true
                },
                {
                    name: '👤 Admin',
                    value: adminDisplay,
                    inline: true
                },
                {
                    name: `✅ ${orderNumber}`,
                    value: `👤 ${buyer}\n🎮 ${product}\n⏰ ${workingHours}`,
                    inline: false
                }
            )
            .setTimestamp();

        await summaryChannel.send({ embeds: [summaryEmbed] });

        // Update sticky total-hours embed after sending
        await this.updateAdminTotalHoursSummary(adminId, summaryChannel);
    }

    // New helper: recalculate and post a sticky total-hours embed in admin summary channel
    async updateAdminTotalHoursSummary(adminId, summaryChannel) {
        try {
            // Prefer persisted entries as source of truth
            const totals = this.getTotals(adminId);
            const totalHours = totals?.total || 0;

            console.log(`[TotalHours] computed total for ${adminId} from store: ${totalHours}`);

            // Remove existing sticky message(s)
            try {
                const fetched = await summaryChannel.messages.fetch({ limit: 100 });
                const existingSticky = fetched.find(m => m.embeds[0]?.title === '🧾 Total Working Hours');
                if (existingSticky) {
                    await existingSticky.delete().catch(() => {});
                }
            } catch (e) {
                // ignore message fetch/delete errors
            }

            // Post new sticky embed at bottom
            const sticky = new EmbedBuilder()
                .setColor(0xF59E0B)
                .setTitle('🧾 Total Working Hours')
                .setDescription(`Total working hours for ${await this.getAdminDisplayName(adminId, summaryChannel.guild)}`)
                .addFields({ name: '⏱️ Total Hours', value: `${totalHours} jam`, inline: true }, { name: '🔄 Updated', value: new Date().toLocaleString('id-ID'), inline: true })
                .setTimestamp();

            await summaryChannel.send({ embeds: [sticky] });
        } catch (err) {
            console.error('❌ Failed to update admin total-hours summary:', err);
        }
    }

    async updateStatusMonitoring(interaction, adminId, embed, status) {
        try {
            const guild = interaction.guild;
            const statusChannelName = 'admin-status-monitor';

            // Find or create status channel
            let statusChannel = guild.channels.cache.find(c => c.name === statusChannelName && c.type === 0);
            if (!statusChannel) {
                statusChannel = await guild.channels.create({
                    name: statusChannelName,
                    type: 0,
                    topic: 'Admin status monitor',
                    permissionOverwrites: [
                        { id: guild.roles.everyone.id || guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] }
                    ]
                });
                console.log(`✅ Created status channel: #${statusChannelName}`);
            }

            // Use canonical admin channel name to avoid duplicates
            const adminChannelName = await this.getAdminChannelName(adminId, guild);
             const adminChannel = guild.channels.cache.find(c => c.name === adminChannelName && c.type === 0);

            // Count active orders in admin channel by checking messages with customId pattern or embed titles
            let activeCount = 0;
            const activeOrders = [];
            if (adminChannel) {
                try {
                    const adminMsgs = await adminChannel.messages.fetch({ limit: 100 });
                    adminMsgs.forEach(m => {
                        const hasOrderButtons = m.components?.some(row => row.components?.some(c => c.customId && (c.customId.startsWith('input_hours_') || c.customId.startsWith('complete_order_'))));
                        const t = m.embeds?.[0]?.title;
                        if (hasOrderButtons || (typeof t === 'string' && (t.includes('Order Assigned') || t.includes('Order Assigned - Working')))) {
                            activeCount++;
                            const orderNumber = m.embeds?.[0]?.fields?.find(f => f.name === '📋 Nomor Pesanan')?.value || 'Unknown';
                            const expectedCompletion = m.embeds?.[0]?.fields?.find(f => f.name === '🕐 Expected Completion')?.value || 'Not set';
                            activeOrders.push({ orderNumber, expectedCompletion });
                        }
                    });
                } catch (e) {
                    // ignore fetch errors
                }
            }

            // Find existing status embed for this admin/channel
            const fetched = await statusChannel.messages.fetch({ limit: 100 });
            const existing = fetched.find(m => m.embeds[0]?.fields?.find(f => f.name === '📁 Channel' && f.value === adminChannelName));

            // Resolve admin display name
            const displayName = (await this.getAdminDisplayName(adminId, guild)) || adminId;

            const statusEmbed = new EmbedBuilder()
                .setColor(0x3B82F6)
                .setTitle(`📈 Admin Status - ${displayName.toUpperCase()}`)
                .addFields(
                    { name: '📁 Channel', value: adminChannelName, inline: true },
                    { name: '🔢 Active Orders', value: `${activeCount}`, inline: true },
                    { name: '🔄 Status', value: `${status}`, inline: true }
                )
                .setTimestamp();

            // Add active orders list
            if (activeOrders.length > 0) {
                const orderDetails = activeOrders.map(o => `• ${o.orderNumber} (⏰ ${o.expectedCompletion})`).join('\n');
                statusEmbed.addFields({ name: '📋 Active Transactions', value: orderDetails, inline: false });
            }

            if (existing) {
                await existing.edit({ embeds: [statusEmbed] });
            } else {
                await statusChannel.send({ embeds: [statusEmbed] });
            }
        } catch (err) {
            console.error('❌ Failed to update status monitoring:', err);
        }
    }

    // Set bot presence (limited compared to Game SDK rich presence)
    async updatePresence() {
        try {
            if (!this.client || !this.client.user) return;

            // Note: Bot tokens cannot set full "Rich Presence" (largeImageKey, smallImageKey, party, joinSecret).
            // Those features require the Discord Game SDK / RPC used by native clients. We approximate with activity + timestamps.

            const startTs = Math.floor(Date.now());
            const endTs = Math.floor(Date.now() + 60 * 60 * 1000); // 1 hour from now

            await this.client.user.setPresence({
                activities: [
                    {
                        name: 'itemku.com/t/mishopz',
                        type: 0, // Playing
                        timestamps: { start: startTs, end: endTs }
                    }
                ],
                status: 'online'
            });

            console.log('✅ Presence updated');
        } catch (err) {
            console.error('❌ Failed to update presence:', err);
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


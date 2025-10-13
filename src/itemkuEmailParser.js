const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class ItemkuEmailParser {
    constructor() {
        this.maxContentLength = 2000;
    }

    createItemkuEmbed(emailData) {
        try {
            const itemkuData = this.parseItemkuEmail(emailData.html || emailData.text);
            
            const embed = new EmbedBuilder()
                .setColor(0xFF8900) // Itemku orange color
                .setTitle('🛒 Itemku - Dagangan Dibeli!')
                .setAuthor({
                    name: 'Itemku',
                    iconURL: 'https://files.itemku.com/logo/itemku/itemku-logo-color-transparent.png',
                    url: 'https://itemku.com'
                })
                .setTimestamp()
                .setFooter({
                    text: `Email ID: ${emailData.uid}`,
                    iconURL: 'https://files.itemku.com/logo/itemku/itemku-logo-color-transparent.png'
                });

            // Add order information
            if (itemkuData.orderNumber) {
                embed.addFields({
                    name: '📋 Nomor Pesanan',
                    value: `\`${itemkuData.orderNumber}\``,
                    inline: true
                });
            }

            if (itemkuData.transactionTime) {
                embed.addFields({
                    name: '⏰ Waktu Transaksi',
                    value: itemkuData.transactionTime,
                    inline: true
                });
            }

            if (itemkuData.buyerName) {
                embed.addFields({
                    name: '👤 Pembeli',
                    value: itemkuData.buyerName,
                    inline: true
                });
            }

            if (itemkuData.productName) {
                embed.addFields({
                    name: '🎮 Produk',
                    value: itemkuData.productName,
                    inline: true
                });
            }

            if (itemkuData.quantity) {
                embed.addFields({
                    name: '📦 Jumlah',
                    value: itemkuData.quantity,
                    inline: true
                });
            }

            if (itemkuData.price) {
                embed.addFields({
                    name: '💰 Harga',
                    value: `**${itemkuData.price}**`,
                    inline: true
                });
            }

            // Add transaction info (username/password)
            if (itemkuData.transactionInfo) {
                embed.addFields({
                    name: '🔑 Informasi Transaksi',
                    value: `\`\`\`${itemkuData.transactionInfo}\`\`\``,
                    inline: false
                });
            }

            // Add deadline
            if (itemkuData.deadline) {
                embed.addFields({
                    name: '⏳ Batas Waktu Pengiriman',
                    value: itemkuData.deadline,
                    inline: false
                });
            }

            // Add action button (simulated with field)
            embed.addFields({
                name: '🔗 Tindakan',
                value: '[Lihat Rincian Pesanan](https://tokoku.itemku.com/riwayat-pesanan)',
                inline: false
            });

            // Create admin assignment dropdown
            const adminSelectMenu = new StringSelectMenuBuilder()
                .setCustomId(`assign_admin_${emailData.uid}`)
                .setPlaceholder('👤 Assign ke Admin...')
                .addOptions([
                    {
                        label: 'Admin 1',
                        description: 'Assign pesanan ke Admin 1',
                        value: 'admin1'
                    },
                    {
                        label: 'Admin 2', 
                        description: 'Assign pesanan ke Admin 2',
                        value: 'admin2'
                    },
                    {
                        label: 'Admin 3',
                        description: 'Assign pesanan ke Admin 3',
                        value: 'admin3'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(adminSelectMenu);

            return { embeds: [embed], components: [row] };
        } catch (error) {
            console.error('❌ Error creating Itemku embed:', error);
            return this.createErrorEmbed(emailData, error);
        }
    }

    parseItemkuEmail(htmlContent) {
        const data = {};

        try {
            // Parse order number
            const orderMatch = htmlContent.match(/OD\d+/);
            if (orderMatch) {
                data.orderNumber = orderMatch[0];
            }

            // Parse transaction time
            const timeMatch = htmlContent.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
            if (timeMatch) {
                data.transactionTime = timeMatch[1];
            }

            // Parse buyer name
            const buyerMatch = htmlContent.match(/Nama Pembeli.*?<td[^>]*>([^<]+)<\/td>/s);
            if (buyerMatch) {
                data.buyerName = buyerMatch[1].trim();
            }

            // Parse transaction info (username/password)
            const infoMatch = htmlContent.match(/Informasi Transaksi.*?<td[^>]*>(.*?)<\/td>/s);
            if (infoMatch) {
                data.transactionInfo = this.stripHtml(infoMatch[1]).trim();
            }

            // Parse product name
            const productMatch = htmlContent.match(/Produk.*?<td[^>]*>(.*?)<br>/s);
            if (productMatch) {
                data.productName = this.stripHtml(productMatch[1]).trim();
            }

            // Parse quantity
            const quantityMatch = htmlContent.match(/Jumlah.*?<td[^>]*>(.*?)<\/td>/s);
            if (quantityMatch) {
                data.quantity = this.stripHtml(quantityMatch[1]).trim();
            }

            // Parse price
            const priceMatch = htmlContent.match(/Harga Produk.*?<b[^>]*>([^<]+)<\/b>/s);
            if (priceMatch) {
                data.price = priceMatch[1].trim();
            }

            // Parse deadline
            const deadlineMatch = htmlContent.match(/maksimal sebelum ([^.]+)\./);
            if (deadlineMatch) {
                data.deadline = deadlineMatch[1].trim();
            }

        } catch (error) {
            console.error('❌ Error parsing Itemku email:', error);
        }

        return data;
    }

    stripHtml(html) {
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
            .replace(/&amp;/g, '&') // Replace &amp; with &
            .replace(/&lt;/g, '<') // Replace &lt; with <
            .replace(/&gt;/g, '>') // Replace &gt; with >
            .replace(/&quot;/g, '"') // Replace &quot; with "
            .replace(/&#39;/g, "'") // Replace &#39; with '
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
    }

    createErrorEmbed(emailData, error) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000) // Red color for error
            .setTitle('❌ Error Processing Itemku Email')
            .setDescription(`Failed to process email: ${error.message}`)
            .addFields(
                {
                    name: '📧 Subject',
                    value: emailData.subject || 'Unknown',
                    inline: false
                },
                {
                    name: '📅 Date',
                    value: this.formatDate(emailData.date),
                    inline: false
                }
            )
            .setTimestamp();

        return embed;
    }

    formatDate(date) {
        try {
            const emailDate = new Date(date);
            return emailDate.toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Unknown date';
        }
    }
}

module.exports = ItemkuEmailParser;

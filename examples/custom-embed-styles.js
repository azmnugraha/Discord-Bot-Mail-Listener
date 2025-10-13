// Example: Custom embed styles for different types of emails
// This shows how to customize the email parser for different email types

const { EmbedBuilder } = require('discord.js');

class CustomEmailParser {
    constructor() {
        this.styles = {
            important: {
                color: 0xFF0000, // Red
                icon: '🚨',
                title: 'Important Email'
            },
            notification: {
                color: 0x00FF00, // Green
                icon: '📬',
                title: 'New Notification'
            },
            promotion: {
                color: 0xFFA500, // Orange
                icon: '🎯',
                title: 'Promotional Email'
            },
            default: {
                color: 0x7C3AED, // Purple
                icon: '📧',
                title: 'New Email'
            }
        };
    }

    createEmailEmbed(emailData) {
        const style = this.determineEmailStyle(emailData);
        const embedConfig = this.styles[style];

        const embed = new EmbedBuilder()
            .setColor(embedConfig.color)
            .setTitle(`${embedConfig.icon} ${embedConfig.title}`)
            .setAuthor({
                name: 'Email Monitor',
                iconURL: 'https://cdn-icons-png.flaticon.com/512/281/281769.png'
            })
            .addFields(
                {
                    name: '👤 From',
                    value: this.formatSender(emailData.from),
                    inline: true
                },
                {
                    name: '📧 Subject',
                    value: this.truncateText(emailData.subject, 100),
                    inline: false
                },
                {
                    name: '📅 Received',
                    value: this.formatDate(emailData.date),
                    inline: true
                }
            )
            .setTimestamp();

        // Add content preview
        const preview = this.createContentPreview(emailData);
        if (preview) {
            embed.setDescription(preview);
        }

        // Add priority indicator for important emails
        if (style === 'important') {
            embed.addFields({
                name: '⚠️ Priority',
                value: 'High',
                inline: true
            });
        }

        // Add category tag
        embed.addFields({
            name: '🏷️ Category',
            value: this.getCategoryTag(style),
            inline: true
        });

        return embed;
    }

    determineEmailStyle(emailData) {
        const subject = emailData.subject.toLowerCase();
        const from = emailData.from.toLowerCase();

        // Important emails
        if (subject.includes('urgent') || subject.includes('important') || 
            subject.includes('critical') || subject.includes('asap')) {
            return 'important';
        }

        // Promotional emails
        if (subject.includes('sale') || subject.includes('offer') || 
            subject.includes('discount') || subject.includes('promo')) {
            return 'promotion';
        }

        // Notification emails
        if (subject.includes('notification') || subject.includes('alert') || 
            subject.includes('reminder') || subject.includes('update')) {
            return 'notification';
        }

        return 'default';
    }

    formatSender(sender) {
        // Extract name and email
        const match = sender.match(/^(.+?)\s*<(.+?)>$/);
        if (match) {
            return `${match[1]}\n*${match[2]}*`;
        }
        return sender;
    }

    createContentPreview(emailData) {
        let content = emailData.text || emailData.html || '';
        
        // Strip HTML if present
        content = content.replace(/<[^>]*>/g, '');
        
        // Clean up whitespace
        content = content.replace(/\s+/g, ' ').trim();
        
        // Truncate to preview length
        const maxLength = 200;
        if (content.length > maxLength) {
            content = content.substring(0, maxLength) + '...';
        }
        
        return content || 'No preview available';
    }

    getCategoryTag(style) {
        const tags = {
            important: '🔴 High Priority',
            notification: '🟢 Notification',
            promotion: '🟡 Promotion',
            default: '🔵 Regular'
        };
        
        return tags[style] || tags.default;
    }

    formatDate(date) {
        const emailDate = new Date(date);
        const now = new Date();
        const diffMs = now - emailDate;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffMins < 1) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else {
            return emailDate.toLocaleDateString('id-ID');
        }
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    }
}

module.exports = CustomEmailParser;


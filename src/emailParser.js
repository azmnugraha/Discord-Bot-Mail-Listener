const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

class EmailParser {
    constructor() {
        this.maxContentLength = 2000; // Discord embed description limit
        this.maxSubjectLength = 256; // Discord embed title limit
    }

    createEmailEmbed(emailData) {
        try {
            const embed = new EmbedBuilder()
                .setColor(0x7C3AED) // Purple color
                .setTitle(this.truncateText(emailData.subject, this.maxSubjectLength))
                .setAuthor({
                    name: '📧 New Email',
                    iconURL: 'https://cdn-icons-png.flaticon.com/512/281/281769.png'
                })
                .addFields(
                    {
                        name: '👤 From',
                        value: emailData.from,
                        inline: true
                    },
                    {
                        name: '👥 To',
                        value: emailData.to,
                        inline: true
                    },
                    {
                        name: '📅 Date',
                        value: this.formatDate(emailData.date),
                        inline: true
                    }
                )
                .setTimestamp()
                .setFooter({
                    text: `UID: ${emailData.uid}`,
                    iconURL: 'https://cdn-icons-png.flaticon.com/512/281/281769.png'
                });

            // Add content
            const content = this.extractContent(emailData);
            if (content) {
                embed.setDescription(content);
            }

            // Add attachments info if any
            if (emailData.attachments && emailData.attachments.length > 0) {
                const attachmentInfo = emailData.attachments.map(att => 
                    `📎 ${att.filename} (${this.formatFileSize(att.size)})`
                ).join('\n');
                
                embed.addFields({
                    name: '📎 Attachments',
                    value: attachmentInfo,
                    inline: false
                });
            }

            // Add email source info
            embed.addFields({
                name: '📬 Source',
                value: 'Yahoo Mail',
                inline: false
            });

            return embed;
        } catch (error) {
            console.error('❌ Error creating email embed:', error);
            return this.createErrorEmbed(emailData, error);
        }
    }

    extractContent(emailData) {
        let content = '';

        // Prefer HTML content if available, otherwise use text
        if (emailData.html) {
            content = this.stripHtml(emailData.html);
        } else if (emailData.text) {
            content = emailData.text;
        }

        // Clean up the content
        content = this.cleanContent(content);
        
        // Truncate if too long
        if (content.length > this.maxContentLength) {
            content = this.truncateText(content, this.maxContentLength - 3) + '...';
        }

        return content || 'No content available';
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
            .trim();
    }

    cleanContent(content) {
        return content
            .replace(/\r\n/g, '\n') // Normalize line endings
            .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
            .trim();
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength);
    }

    formatDate(date) {
        try {
            const emailDate = new Date(date);
            const now = new Date();
            const diffMs = now - emailDate;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffMins < 1) {
                return 'Just now';
            } else if (diffMins < 60) {
                return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
            } else if (diffHours < 24) {
                return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            } else if (diffDays < 7) {
                return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            } else {
                return emailDate.toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        } catch (error) {
            return 'Unknown date';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    createErrorEmbed(emailData, error) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000) // Red color for error
            .setTitle('❌ Error Processing Email')
            .setDescription(`Failed to process email: ${error.message}`)
            .addFields(
                {
                    name: '👤 From',
                    value: emailData.from || 'Unknown',
                    inline: true
                },
                {
                    name: '📧 Subject',
                    value: emailData.subject || 'Unknown',
                    inline: true
                },
                {
                    name: '📅 Date',
                    value: this.formatDate(emailData.date),
                    inline: true
                }
            )
            .setTimestamp();

        return embed;
    }

    // Utility method to create a simple notification embed
    createNotificationEmbed(emailData) {
        const embed = new EmbedBuilder()
            .setColor(0x00FF00) // Green color
            .setTitle('📬 Email Notification')
            .setDescription(`New email received from **${emailData.from}**`)
            .addFields(
                {
                    name: '📧 Subject',
                    value: this.truncateText(emailData.subject, 100),
                    inline: false
                }
            )
            .setTimestamp();

        return embed;
    }
}

module.exports = EmailParser;


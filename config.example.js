// Example configuration file
// Copy this file to config.js and modify as needed

module.exports = {
    // Discord Bot Configuration
    discord: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.DISCORD_CLIENT_ID,
        channelId: process.env.DISCORD_CHANNEL_ID,
        
        // Bot status configuration
        status: {
            type: 'WATCHING', // PLAYING, STREAMING, LISTENING, WATCHING
            text: 'for new emails 📧'
        }
    },

    // Yahoo Mail IMAP Configuration
    yahoo: {
        email: process.env.YAHOO_EMAIL,
        password: process.env.YAHOO_PASSWORD,
        host: process.env.YAHOO_IMAP_HOST || 'imap.mail.yahoo.com',
        port: parseInt(process.env.YAHOO_IMAP_PORT) || 993,
        tls: true,
        tlsOptions: { 
            rejectUnauthorized: false 
        }
    },

    // Bot Behavior Configuration
    bot: {
        checkInterval: parseInt(process.env.CHECK_INTERVAL) || 30000, // 30 seconds
        maxContentLength: 2000, // Discord embed description limit
        maxSubjectLength: 256,  // Discord embed title limit
        
        // Email filtering options
        filters: {
            // Only process emails from today
            onlyRecent: true,
            // Maximum age in hours
            maxAgeHours: 24,
            // Ignore emails from these addresses (regex patterns)
            ignoreFrom: [],
            // Only process emails from these addresses (regex patterns)
            onlyFrom: [],
            // Ignore emails with these subjects (regex patterns)
            ignoreSubjects: [],
            // Minimum content length to process
            minContentLength: 10
        }
    },

    // Logging Configuration
    logging: {
        level: 'info', // error, warn, info, debug
        enableConsole: true,
        enableFile: false,
        logFile: 'bot.log'
    }
};


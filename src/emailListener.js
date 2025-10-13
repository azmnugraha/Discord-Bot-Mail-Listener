const EventEmitter = require('events');
const Imap = require('imap');
const { simpleParser } = require('mailparser');

class EmailListener extends EventEmitter {
    constructor() {
        super();
        this.imap = null;
        this.isConnected = false;
        this.isMonitoring = false;
        this.checkInterval = null;
        this.processedEmails = new Set(); // Track processed emails to avoid duplicates
        this.setupImapConnection();
    }

    setupImapConnection() {
        this.imap = new Imap({
            user: process.env.YAHOO_EMAIL,
            password: process.env.YAHOO_PASSWORD,
            host: process.env.YAHOO_IMAP_HOST || 'imap.mail.yahoo.com',
            port: parseInt(process.env.YAHOO_IMAP_PORT) || 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }
        });

        this.imap.on('ready', () => {
            console.log('✅ Connected to Yahoo IMAP server');
            this.isConnected = true;
            this.emit('connected');
        });

        this.imap.on('error', (err) => {
            console.error('❌ IMAP Error:', err);
            this.isConnected = false;
            this.emit('error', err);
        });

        this.imap.on('end', () => {
            console.log('📧 IMAP connection ended');
            this.isConnected = false;
        });
    }

    async connect() {
        return new Promise((resolve, reject) => {
            if (this.isConnected) {
                resolve();
                return;
            }

            this.imap.once('ready', resolve);
            this.imap.once('error', reject);
            this.imap.connect();
        });
    }

    async disconnect() {
        if (this.imap && this.isConnected) {
            this.imap.end();
        }
    }

    async checkForNewEmails() {
        if (!this.isConnected) {
            console.log('⚠️ Not connected to IMAP server');
            return;
        }

        try {
            this.imap.openBox('INBOX', false, (err, box) => {
                if (err) {
                    console.error('❌ Error opening INBOX:', err);
                    return;
                }

                console.log(`📧 Checking ${box.messages.total} messages in INBOX`);

                // Search for unread emails from no-reply@itemku.com with specific subject
                const searchCriteria = [
                    'UNSEEN',
                    ['FROM', 'no-reply@itemku.com'],
                    ['SUBJECT', 'Dagangan Kamu Dibeli!']
                ];

                this.imap.search(searchCriteria, (err, results) => {
                    if (err) {
                        console.error('❌ Search error:', err);
                        return;
                    }

                    if (!results || results.length === 0) {
                        console.log('📭 No new Itemku emails found');
                        return;
                    }

                    console.log(`📬 Found ${results.length} new Itemku email(s)`);

                    // Fetch only the found emails
                    const fetch = this.imap.fetch(results, {
                        bodies: '',
                        struct: true,
                        markSeen: true // Mark as read after processing
                    });

                fetch.on('message', (msg, seqno) => {
                    let buffer = '';
                    let uid = null;

                    msg.on('body', (stream, info) => {
                        stream.on('data', (chunk) => {
                            buffer += chunk.toString('utf8');
                        });
                    });

                    msg.on('attributes', (attrs) => {
                        uid = attrs.uid;
                    });

                    msg.once('end', async () => {
                        try {
                            // Check if we've already processed this email
                            if (this.processedEmails.has(uid)) {
                                return;
                            }

                            const parsed = await simpleParser(buffer);
                            
                            // Only process emails from today or recent
                            const emailDate = new Date(parsed.date);
                            const today = new Date();
                            const isRecent = (today - emailDate) < (24 * 60 * 60 * 1000); // Within 24 hours

                            if (isRecent && uid) {
                                this.processedEmails.add(uid);
                                
                                const emailData = {
                                    uid: uid,
                                    from: parsed.from?.text || 'Unknown Sender',
                                    to: parsed.to?.text || 'Unknown Recipient',
                                    subject: parsed.subject || 'No Subject',
                                    date: parsed.date,
                                    text: parsed.text || '',
                                    html: parsed.html || '',
                                    attachments: parsed.attachments || []
                                };

                                console.log(`📬 New email detected: ${emailData.subject} from ${emailData.from}`);
                                this.emit('newEmail', emailData);
                            }
                        } catch (parseError) {
                            console.error('❌ Error parsing email:', parseError);
                        }
                    });
                });

                fetch.once('error', (err) => {
                    console.error('❌ Fetch error:', err);
                });

                fetch.once('end', () => {
                    console.log('✅ Email check completed');
                });
                });
            });
        } catch (error) {
            console.error('❌ Error checking for new emails:', error);
        }
    }

    start() {
        if (this.isMonitoring) {
            console.log('⚠️ Email monitoring already started');
            return;
        }

        this.connect().then(() => {
            console.log('🚀 Starting email monitoring...');
            this.isMonitoring = true;
            
            // Initial check
            this.checkForNewEmails();
            
            // Set up periodic checking
            const interval = parseInt(process.env.CHECK_INTERVAL) || 30000; // 30 seconds default
            this.checkInterval = setInterval(() => {
                this.checkForNewEmails();
            }, interval);

            console.log(`⏰ Email monitoring started (checking every ${interval/1000} seconds)`);
        }).catch((error) => {
            console.error('❌ Failed to start email monitoring:', error);
            this.emit('error', error);
        });
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
        this.isMonitoring = false;
        this.disconnect();
        console.log('🛑 Email monitoring stopped');
    }
}

module.exports = EmailListener;


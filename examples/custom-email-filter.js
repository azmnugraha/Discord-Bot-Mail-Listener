// Example: Custom email filtering
// This shows how to modify the email listener to filter emails

const EmailListener = require('../src/emailListener');

class CustomEmailListener extends EmailListener {
    constructor() {
        super();
        
        // Custom filters
        this.filters = {
            // Only process emails from specific domains
            allowedDomains: ['@gmail.com', '@yahoo.com', '@outlook.com'],
            
            // Ignore emails with these subjects
            ignoredSubjects: ['SPAM', 'Promotion', 'Newsletter'],
            
            // Minimum content length
            minContentLength: 50,
            
            // Only process emails from today
            onlyToday: true
        };
    }

    // Override the email processing method
    async processEmail(emailData) {
        // Apply custom filters
        if (!this.shouldProcessEmail(emailData)) {
            console.log(`🚫 Email filtered out: ${emailData.subject}`);
            return;
        }

        // Call parent method to emit the event
        this.emit('newEmail', emailData);
    }

    shouldProcessEmail(emailData) {
        // Check domain filter
        const fromDomain = emailData.from.split('@')[1];
        if (!this.filters.allowedDomains.some(domain => fromDomain === domain)) {
            return false;
        }

        // Check subject filter
        if (this.filters.ignoredSubjects.some(subject => 
            emailData.subject.toLowerCase().includes(subject.toLowerCase()))) {
            return false;
        }

        // Check content length
        if (emailData.text.length < this.filters.minContentLength) {
            return false;
        }

        // Check if email is from today
        if (this.filters.onlyToday) {
            const emailDate = new Date(emailData.date);
            const today = new Date();
            const isToday = emailDate.toDateString() === today.toDateString();
            if (!isToday) {
                return false;
            }
        }

        return true;
    }
}

module.exports = CustomEmailListener;


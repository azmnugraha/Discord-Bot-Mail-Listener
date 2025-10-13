# 🚀 Quick Start Guide

## Langkah Cepat untuk Menjalankan Bot

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Konfigurasi
```bash
npm run setup
```
Atau manual copy `.env.example` ke `.env` dan isi konfigurasi.

### 3. Test Koneksi
```bash
npm test
```

### 4. Jalankan Bot
```bash
# Development (dengan auto-restart)
npm run dev

# Production
npm start
```

## 📋 Checklist Setup

### Discord Bot
- [ ] Bot dibuat di Discord Developer Portal
- [ ] Token bot dicopy ke `DISCORD_TOKEN`
- [ ] Client ID dicopy ke `DISCORD_CLIENT_ID`
- [ ] Bot diinvite ke server dengan permissions:
  - Send Messages
  - Read Messages
  - Embed Links
- [ ] Channel ID dicopy ke `DISCORD_CHANNEL_ID`

### Yahoo Mail
- [ ] IMAP diaktifkan di pengaturan Yahoo
- [ ] 2FA diaktifkan
- [ ] App Password dibuat dan dicopy ke `YAHOO_PASSWORD`
- [ ] Email address dicopy ke `YAHOO_EMAIL`

## 🔧 Troubleshooting

### Bot tidak bisa login
- Pastikan token Discord benar
- Pastikan bot sudah diinvite ke server

### Email tidak muncul
- Pastikan channel ID benar
- Pastikan bot punya permission di channel
- Check console untuk error

### IMAP connection error
- Pastikan IMAP sudah diaktifkan
- Gunakan App Password, bukan password biasa
- Pastikan 2FA aktif

## 📞 Support

Jika ada masalah, check:
1. Console logs untuk error messages
2. Discord bot permissions
3. Yahoo Mail IMAP settings
4. Network connectivity

## 🎯 Fitur Utama

- ✅ Real-time email monitoring
- ✅ Beautiful Discord embeds
- ✅ Attachment support
- ✅ Error handling
- ✅ Auto-reconnect
- ✅ Configurable intervals


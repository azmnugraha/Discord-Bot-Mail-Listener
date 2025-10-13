# Discord Email Bot - Itemku Order Tracker

Bot Discord yang memantau email masuk dari Yahoo Mail melalui IMAP dan mengirimkan detailnya ke server Discord dalam format embed yang menarik, khusus untuk tracking pesanan Itemku.

## 🚀 Fitur

- ✅ **Real-time Email Monitoring**: Monitor email masuk dari Yahoo Mail secara real-time
- ✅ **Itemku-Specific Filtering**: Hanya memproses email dari `no-reply@itemku.com` dengan subject "Dagangan Kamu Dibeli!"
- ✅ **Interactive Admin Assignment**: Dropdown untuk assign pesanan ke admin tertentu
- ✅ **Hour Input System**: Modal popup untuk input jam kerja dengan validasi
- ✅ **Expected Completion Time**: Kalkulasi otomatis waktu selesai
- ✅ **Channel Management**: Otomatis buat channel admin dan summary channel
- ✅ **Order Tracking**: Sistem tracking pesanan dari assignment sampai completion
- ✅ **Status Monitoring**: Real-time monitoring semua admin di satu channel
- ✅ **Daily Summary**: Summary pekerjaan per hari dengan update otomatis
- ✅ **Auto Mark as Read**: Email otomatis ditandai sudah dibaca setelah diproses
- ✅ **Unread Only**: Hanya memproses email yang belum dibaca
- ✅ **Beautiful Embeds**: Format embed yang menarik dengan warna Itemku
- ✅ **Error Handling**: Auto-reconnect dan error handling yang robust

## 📋 Prasyarat

1. **Node.js** (versi 16 atau lebih baru)
2. **Akun Yahoo Mail** dengan akses IMAP
3. **Discord Bot** dengan token dan permissions yang sesuai

## 🛠️ Instalasi

1. **Clone atau download repository ini**
   ```bash
   git clone <repository-url>
   cd discord-email-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup Environment Variables**
   
   Copy file `.env.example` menjadi `.env` dan isi dengan konfigurasi Anda:
   ```bash
   cp .env.example .env
   ```

   Edit file `.env` dengan informasi berikut:
   ```env
   # Discord Bot Configuration
   DISCORD_TOKEN=your_discord_bot_token_here
   DISCORD_CLIENT_ID=your_discord_client_id_here
   DISCORD_CHANNEL_ID=your_discord_channel_id_here

   # Yahoo Mail IMAP Configuration
   YAHOO_EMAIL=your_yahoo_email@yahoo.com
   YAHOO_PASSWORD=your_yahoo_app_password_here
   YAHOO_IMAP_HOST=imap.mail.yahoo.com
   YAHOO_IMAP_PORT=993

   # Bot Configuration
   CHECK_INTERVAL=30000
   ```

## 🔧 Konfigurasi

### 1. Setup Discord Bot

1. Kunjungi [Discord Developer Portal](https://discord.com/developers/applications)
2. Buat aplikasi baru dan beri nama
3. Di tab "Bot", klik "Add Bot"
4. Copy token bot dan masukkan ke `DISCORD_TOKEN`
5. Di tab "OAuth2 > URL Generator":
   - Pilih scope: `bot`
   - Pilih permissions: `Send Messages`, `Read Messages`, `Use Slash Commands`
   - Copy URL dan gunakan untuk invite bot ke server

### 2. Setup Yahoo Mail

1. **Enable IMAP Access:**
   - Login ke Yahoo Mail
   - Go to Settings > More Settings > Mailboxes
   - Enable "Access your Yahoo Mail elsewhere using IMAP"

2. **Generate App Password:**
   - Go to Yahoo Account Security
   - Enable 2-Factor Authentication jika belum
   - Generate "App Password" untuk bot
   - Gunakan app password ini di `YAHOO_PASSWORD` (bukan password biasa)

3. **Get Channel ID:**
   - Enable Developer Mode di Discord
   - Right-click pada channel yang diinginkan
   - Klik "Copy ID"
   - Masukkan ke `DISCORD_CHANNEL_ID`

## 🚀 Menjalankan Bot

### Development Mode (dengan auto-restart)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## 🎮 Cara Menggunakan Bot

### 1. **Email Monitoring**
- Bot akan otomatis memantau email Yahoo setiap 30 detik
- Hanya email dari `no-reply@itemku.com` dengan subject "Dagangan Kamu Dibeli!" yang diproses
- Email otomatis ditandai sudah dibaca setelah diproses

### 2. **Admin Assignment**
- Setiap pesanan baru akan muncul di channel #detail dengan dropdown "Assign ke Admin"
- Pilih admin dari dropdown (Admin 1, Admin 2, Admin 3)
- Bot akan otomatis buat channel admin (contoh: #admin1-orders)
- Pesanan akan dikirim ke channel admin tersebut

### 3. **Order Completion**
- Di channel admin, ada tombol "✅ Mark as Complete"
- Klik tombol untuk menandai pesanan selesai
- Bot akan buat summary channel (contoh: #admin1-summary)
- Summary pekerjaan akan dikirim ke channel summary

### 4. **Channel Management**
- **#detail**: Channel utama untuk notifikasi pesanan baru
- **#admin-status-monitor**: Channel monitoring status semua admin (public)
- **#admin1-orders**: Channel khusus untuk pesanan Admin 1 (private)
- **#admin1-summary**: Channel summary pekerjaan Admin 1 (private)
- Channel admin dan summary dibuat otomatis dan bersifat private

### 5. **Hour Input System**
- Admin klik tombol "⏰ Input Hours" di channel admin
- Modal popup muncul untuk input jam kerja (1-24 jam)
- Bot kalkulasi otomatis waktu selesai (waktu sekarang + jam kerja)
- Embed update dengan informasi jam kerja dan expected completion

### 6. **Status Monitoring**
- Channel `#admin-status-monitor` menampilkan status semua admin
- Satu embed per admin dengan informasi:
  - 👤 Admin
  - 📋 Active Orders (jumlah pesanan aktif)
  - 📁 Channel (link ke channel admin)
  - ⏰ Last Update
- Update otomatis saat ada perubahan status

### 7. **Order Completion**
- Admin klik "✅ Mark as Complete" di channel admin
- Pesanan otomatis dihapus dari channel admin
- Status monitoring update (jumlah active orders berkurang)
- Summary ditambahkan ke daily summary

### 8. **Daily Summary**
- Satu embed per hari per admin
- Update otomatis saat ada order baru selesai
- Format ringkas: Date, Admin, Order details (Buyer, Product, Hours)
- Tidak ada field "Total Orders"

## 🎯 Workflow Lengkap

### **Step 1: Email Detection & Assignment**
```
📧 Email Itemku masuk
↓
📱 Embed di #detail dengan dropdown
↓
👤 User pilih admin dari dropdown
↓
📁 Bot buat channel admin (#admin1-orders)
↓
📋 Pesanan dikirim ke channel admin dengan 2 tombol:
   - ⏰ Input Hours
   - ✅ Mark as Complete
↓
📊 Status embed dibuat di #admin-status-monitor
```

### **Step 2: Working Hours Input**
```
👤 Admin klik "⏰ Input Hours"
↓
📝 Modal popup untuk input jam
↓
⏰ Admin input jam kerja (contoh: 1)
↓
🤖 Bot kalkulasi waktu selesai
↓
📋 Embed update dengan informasi jam kerja
↓
📊 Status monitoring update
```

### **Step 3: Order Completion**
```
✅ Admin klik "Mark as Complete"
↓
🗑️ Pesanan dihapus dari channel admin
↓
📊 Status monitoring update (active orders berkurang)
↓
📋 Summary ditambahkan ke daily summary
```

## 📁 Channel Structure

```
MiShopz Server
├── #detail (public) - Notifikasi pesanan baru
├── #admin-status-monitor (public) - Real-time status semua admin
├── #admin1-orders (private) - Pesanan Admin 1
├── #admin1-summary (private) - Daily Summary Admin 1
├── #admin2-orders (private) - Pesanan Admin 2
├── #admin2-summary (private) - Daily Summary Admin 2
├── #admin3-orders (private) - Pesanan Admin 3
└── #admin3-summary (private) - Daily Summary Admin 3
```

## 📋 Commands Terminal

### Setup & Installation
```bash
# Install dependencies
npm install

# Setup konfigurasi (interactive)
npm run setup

# Atau setup manual
node create-env.js
```

### Testing & Debugging
```bash
# Test semua koneksi (Discord + Yahoo)
npm test

# Test koneksi Discord saja
node debug-token.js

# Check status bot
node check-bot-status.js
```

### Running Bot
```bash
# Production mode
npm start

# Development mode (auto-restart)
npm run dev
```

### Utilities
```bash
# Check syntax error
node -c src/emailListener.js
node -c src/itemkuEmailParser.js
node -c index.js

# View logs
# Bot akan menampilkan log di console
```

## 📁 Struktur Proyek

```
discord-email-bot/
├── src/
│   ├── emailListener.js    # IMAP connection dan email monitoring
│   └── emailParser.js      # Email parsing dan Discord embed creation
├── index.js                # Main bot file
├── package.json            # Dependencies dan scripts
├── .env.example           # Template environment variables
├── .gitignore             # Git ignore file
└── README.md              # Dokumentasi ini
```

## 🔍 Cara Kerja

1. **Bot Discord** login menggunakan token yang diberikan
2. **Email Listener** terhubung ke Yahoo IMAP server
3. **Monitoring Loop** mengecek email baru setiap interval yang ditentukan
4. **Email Parser** memproses email dan membuat Discord embed
5. **Discord Bot** mengirim embed ke channel yang ditentukan

## ⚙️ Konfigurasi Lanjutan

### Environment Variables

| Variable | Deskripsi | Default |
|----------|-----------|---------|
| `DISCORD_TOKEN` | Token bot Discord | Required |
| `DISCORD_CLIENT_ID` | Client ID bot Discord | Required |
| `DISCORD_CHANNEL_ID` | ID channel untuk notifikasi | Required |
| `YAHOO_EMAIL` | Email Yahoo untuk monitoring | Required |
| `YAHOO_PASSWORD` | App password Yahoo | Required |
| `YAHOO_IMAP_HOST` | Host IMAP Yahoo | imap.mail.yahoo.com |
| `YAHOO_IMAP_PORT` | Port IMAP Yahoo | 993 |
| `CHECK_INTERVAL` | Interval pengecekan email (ms) | 30000 |

### Customization

Anda dapat mengkustomisasi bot dengan memodifikasi:

- **Email Parser** (`src/emailParser.js`): Format embed, warna, dan informasi yang ditampilkan
- **Email Listener** (`src/emailListener.js`): Interval pengecekan dan filter email
- **Main Bot** (`index.js`): Event handling dan integrasi

## 🐛 Troubleshooting

### Bot tidak bisa login ke Discord
- Pastikan token bot benar dan format sesuai (XXXX.XXXX.XXXX)
- Pastikan bot sudah diinvite ke server dengan permissions yang sesuai
- Enable Message Content Intent di Discord Developer Portal

### Tidak bisa connect ke Yahoo IMAP
- Pastikan IMAP sudah diaktifkan di akun Yahoo
- Gunakan App Password, bukan password biasa
- Pastikan 2FA sudah diaktifkan

### Email tidak muncul di Discord
- Pastikan channel ID benar
- Pastikan bot punya permission untuk mengirim pesan ke channel
- Check console log untuk error messages

### Bot berhenti mendeteksi email
- Yahoo mungkin memblokir koneksi karena terlalu sering
- Coba increase `CHECK_INTERVAL` ke nilai yang lebih besar
- Restart bot

### Dropdown/Button tidak berfungsi
- Pastikan bot punya permission "Use Slash Commands"
- Check console untuk error interaction
- Restart bot jika ada masalah

### Channel tidak terbuat otomatis
- Pastikan bot punya permission "Manage Channels"
- Check console untuk error channel creation
- Manual buat channel jika diperlukan

## ❓ FAQ

### Q: Apakah email otomatis ditandai sudah dibaca?
**A:** Ya, email otomatis ditandai sudah dibaca setelah diproses oleh bot.

### Q: Apakah bot hanya memproses email yang belum dibaca?
**A:** Ya, bot hanya memproses email dengan status UNSEEN (belum dibaca).

### Q: Bagaimana cara mengubah admin list di dropdown?
**A:** Edit file `src/itemkuEmailParser.js` pada bagian dropdown options.

### Q: Apakah channel admin dan summary dibuat otomatis?
**A:** Ya, channel dibuat otomatis saat pertama kali admin di-assign. Channel bersifat private (hanya bot yang bisa akses).

### Q: Bagaimana cara mengubah interval pengecekan email?
**A:** Edit `CHECK_INTERVAL` di file `.env` (dalam milidetik).

### Q: Apakah bot bisa handle multiple admin?
**A:** Ya, bot support multiple admin dengan channel terpisah untuk setiap admin.

## 📝 Logs

Bot akan menampilkan log informasi di console:
- ✅ Connection status
- 📧 Email monitoring status
- 📬 New email notifications
- ❌ Error messages

## 🤝 Contributing

1. Fork repository
2. Buat feature branch
3. Commit changes
4. Push ke branch
5. Buat Pull Request

## 📄 License

MIT License - lihat file LICENSE untuk detail.

## ⚠️ Disclaimer

Bot ini dibuat untuk keperluan pribadi dan edukasi. Pastikan Anda mematuhi Terms of Service dari Discord dan Yahoo saat menggunakan bot ini.


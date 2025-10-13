# 🔑 Cara Mendapatkan Discord Bot Token yang Benar

## Langkah-langkah:

### 1. Buka Discord Developer Portal
- Kunjungi: https://discord.com/developers/applications
- Login dengan akun Discord Anda

### 2. Buat Application Baru (jika belum ada)
- Klik "New Application"
- Beri nama aplikasi (contoh: "Email Bot")
- Klik "Create"

### 3. Buat Bot
- Di sidebar kiri, klik "Bot"
- Klik "Add Bot"
- Konfirmasi dengan klik "Yes, do it!"

### 4. Copy Bot Token
- Di halaman Bot, scroll ke bawah ke bagian "Token"
- Klik "Copy" untuk copy token
- **PENTING:** Token harus terlihat seperti: `MTIzNDU2Nzg5MDEyMzQ1Njc4.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOp`

### 5. Pastikan Format Token Benar
Token Discord bot yang benar:
- ✅ Panjang: ~70 karakter
- ✅ Format: 3 bagian dipisah titik (XXXX.XXXX.XXXX)
- ✅ Contoh: `MTIzNDU2Nzg5MDEyMzQ1Njc4.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOp`

### 6. Yang BUKAN Bot Token:
- ❌ Client Secret (untuk OAuth2)
- ❌ Application ID (angka saja)
- ❌ Guild ID atau Channel ID
- ❌ User token (untuk user bot)

## 🔧 Setup Bot Permissions

### 1. Generate Invite URL
- Di sidebar, klik "OAuth2" > "URL Generator"
- Di "Scopes", centang "bot"
- Di "Bot Permissions", centang:
  - Send Messages
  - Read Messages
  - Use Slash Commands
  - Embed Links
  - Attach Files

### 2. Copy URL dan Invite Bot
- Copy URL yang dihasilkan
- Buka URL di browser
- Pilih server Discord Anda
- Klik "Authorize"

## 📝 Update .env File

Setelah mendapat token yang benar, update file `.env`:

```env
DISCORD_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOp
DISCORD_CLIENT_ID=1234567890123456789
DISCORD_CHANNEL_ID=1234567890123456789
```

## 🧪 Test Token

Setelah update .env, jalankan:
```bash
node debug-token.js
```

Jika berhasil, Anda akan melihat:
```
✅ Token format terlihat benar
✅ Discord.js berhasil login
```

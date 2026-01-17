# Arsip Digital - Aplikasi Manajemen Surat

## 🆘 Solusi Error "Something went wrong" saat Koneksi ke GitHub

Jika Anda mengalami error saat menghubungkan ke GitHub, kemungkinan folder `.git` Anda korup atau `node_modules` (yang sangat besar) tidak sengaja ter-track.

**Lakukan langkah "Reset Total" berikut di terminal komputer Anda:**

### 1. Bersihkan Git Lama
```bash
# Hapus folder git lama (Hati-hati, ini menghapus history commit lokal)
rm -rf .git

# Hapus cache npm jika ada masalah dependensi
rm -rf node_modules
rm package-lock.json

# Install ulang dependensi bersih
npm install
```

### 2. Inisialisasi Ulang dengan Benar
```bash
# Inisialisasi Git Baru
git init

# Tambahkan semua file (file di .gitignore seperti node_modules akan otomatis diabaikan)
git add .

# Buat commit pertama
git commit -m "Reset project: Clean setup"
```

### 3. Koneksi ke Repository Baru
(Disarankan buat Repository BARU di GitHub jika yang lama error terus)

```bash
# Ganti URL_REPO_BARU dengan link repo github Anda
git branch -M main
git remote add origin URL_REPO_BARU
git push -u origin main --force
```

---

## 🚀 Deployment Otomatis (GitHub Actions)

Agar website otomatis update di cPanel:

1.  Buka Repo di GitHub > **Settings** > **Secrets and variables** > **Actions**.
2.  Tambahkan Repository Secret:
    *   `FTP_SERVER`: Alamat FTP (misal `ftp.domain.com` atau IP)
    *   `FTP_USERNAME`: Username cPanel/FTP
    *   `FTP_PASSWORD`: Password cPanel/FTP

## 🛠️ Menjalankan Lokal
```bash
npm run dev
```

## 📝 Setup Database Google Sheets
1.  Buka `GoogleAppsScript.js`.
2.  Copy isinya ke Extensions > Apps Script di Google Sheet Anda.
3.  Deploy sebagai **Web App** (Access: Anyone).
4.  Copy URL `/exec` dan masukkan di menu pengaturan aplikasi web.

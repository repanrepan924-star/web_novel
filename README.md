# NovelHub Shared Access

Halaman ini sekarang memiliki panel **Akses Perangkat**. Kunjungan dari perangkat yang berbeda disimpan bersama di `data/accesses.json` dan ditampilkan pada dashboard.

## Menjalankan

1. Install Node.js jika belum tersedia.
2. Buka terminal pada folder ini.
3. Jalankan:

```powershell
node server.js
```

4. Buka `http://localhost:3000` pada komputer server.
5. Agar perangkat lain di jaringan yang sama dapat mengakses, gunakan alamat IPv4 komputer server, misalnya `http://192.168.1.10:3000`.

Komputer server harus tetap hidup, dan Windows Firewall perlu mengizinkan Node.js pada jaringan yang digunakan. Untuk akses melalui internet, server ini perlu di-deploy ke hosting atau tunnel yang memiliki URL publik.

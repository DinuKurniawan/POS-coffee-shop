# ☕ POS Kedai Kopi (Bahasa Indonesia)

Aplikasi Point of Sale berbasis Node.js + TailwindCSS untuk kedai kopi, dengan UI berbahasa Indonesia, format harga Rupiah, dan data persisten.

## Fitur Utama

1. **Login kasir** sebelum mengakses aplikasi.
2. **Kasir/POS** untuk input pelanggan, pilih metode pembayaran, dan simpan transaksi.
3. **Kelola menu** (tambah, ubah, hapus) langsung dari halaman admin.
4. **Riwayat pesanan** dengan fitur cetak ulang struk.
5. **Laporan harian**: total penjualan, jumlah transaksi, rata-rata transaksi, dan breakdown.
6. **Format Rupiah (IDR)** di seluruh tampilan nominal.
7. **Pengaturan pembayaran**:
   - Kelola **rekening bank** (tambah, ubah, hapus)
   - Kelola **PPN dinamis** (0–100%)
8. **Notifikasi pembayaran sukses** untuk pelanggan saat transaksi berhasil.
9. **Modern alerts** (modal/toast) untuk konfirmasi, sukses, dan error.
10. **Data nyata (persisten)**:
   - `data/products.json` untuk menu
   - `data/orders.json` untuk transaksi
   - `data/settings.json` untuk PPN & rekening bank

## Menjalankan Aplikasi

```bash
npm install
npm start
```

Buka: `http://localhost:3000`

## Deployment Vercel

Project ini sudah dikonfigurasi untuk Vercel (`vercel.json` + server Express compatible).

Deploy production:

```bash
vercel --prod
```

## Alur Penggunaan

1. Masukkan **nama kasir** di halaman login.
2. Pilih menu, isi **nama pelanggan**, pilih **metode pembayaran** (Tunai/Kartu/QRIS/Transfer Bank), lalu simpan pesanan.
3. Cetak struk dari halaman kasir atau dari riwayat pesanan.
4. Pantau performa harian di halaman laporan.
5. Kelola data menu di halaman **Kelola Menu**.
6. Kelola PPN dan rekening bank di halaman **Pengaturan**.

## Catatan Data

- Sistem sudah menggunakan data persisten, jadi menu dan transaksi tidak hilang saat server restart.
- Anda bisa mengisi menu aktual toko Anda melalui halaman **Kelola Menu** atau langsung edit `data/products.json`.

## Teknologi

- Node.js + Express
- EJS
- TailwindCSS (CDN)

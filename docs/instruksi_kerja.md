# 📋 Instruksi Kerja — WRM System

---

## 1. Inbound Arrival

### 1.1 Add Manual (Satu per satu)

1. Buka menu **Inbound → Inbound Arrival**
2. Klik tombol **+ Tambah** (biru)
3. Isi form berikut:

| No | Field | Wajib | Keterangan |
|----|-------|:-----:|------------|
| 1 | Tanggal Kedatangan | ✅ | Otomatis terisi tanggal hari ini |
| 2 | Waktu Kedatangan | — | Otomatis terisi jam saat input |
| 3 | Brand | ✅ | Nama brand barang |
| 4 | Receipt No | ✅ | Nomor receipt/tanda terima |
| 5 | PO No | ✅ | Nomor Purchase Order |
| 6 | PO Qty | ✅ | Jumlah qty di PO |
| 7 | Operator | — | Nama operator yang menginput |
| 8 | Note | — | Catatan tambahan |
| 9 | Item Type | — | Pilih: **Barang Jual** / **ATK** / **Gimmick** (default: Barang Jual) |

4. Klik **OK** untuk menyimpan

> **Catatan:** Field **Receive Qty**, **Putaway Qty**, **Pending Qty**, dan **Status** dihitung otomatis dari data Inbound Transaction berdasarkan Receipt No yang sama.

---

### 1.2 Add via Import CSV (Massal)

1. Buka menu **Inbound → Inbound Arrival**
2. Klik tombol **Template** untuk download template CSV
3. Buka file template di Excel / Google Sheets
4. Isi data sesuai kolom:

| Kolom | Format | Contoh |
|-------|--------|--------|
| `date` | YYYY-MM-DD | 2026-02-20 |
| `arrival_time` | YYYY-MM-DD HH:mm:ss | 2026-02-20 08:30:00 |
| `brand` | Teks | Nike |
| `item_type` | Teks | Barang Jual / ATK / Gimmick |
| `receipt_no` | Teks | A2213 |
| `po_no` | Teks | PO-001 |
| `po_qty` | Angka | 1000 |
| `operator` | Teks | Eva |
| `note` | Teks | (opsional) |

5. Simpan file sebagai format **CSV (Comma Separated Values)**
6. Klik tombol **Import** → pilih file CSV yang sudah diisi
7. Tunggu proses import selesai — akan muncul notifikasi "✅ X data imported"

> **Penting:**
> - Data lama **tidak akan terhapus** saat import. Data baru ditambahkan.
> - Kolom `receive_qty`, `putaway_qty`, `pending_qty`, `status` **tidak perlu diisi** — dihitung otomatis.
> - Jika kolom `date` kosong, otomatis terisi tanggal hari ini.
> - Jika kolom `item_type` kosong, otomatis terisi "Barang Jual".

---

## 2. Inbound Transaction

### 2.1 Add Manual (Satu per satu)

1. Buka menu **Inbound → Inbound Transaction**
2. Klik tombol **+ Tambah** (biru)
3. Isi form berikut:

| No | Field | Wajib | Keterangan |
|----|-------|:-----:|------------|
| 1 | Tanggal Transaksi | ✅ | Format: YYYY-MM-DD (contoh: 2026-02-20) |
| 2 | Waktu Transaksi | — | Format: YYYY-MM-DD HH:mm:ss |
| 3 | Receipt No | ✅ | Nomor receipt (harus sama dengan di Arrival untuk kalkulasi otomatis) |
| 4 | SKU | ✅ | Kode SKU barang |
| 5 | Operate Type | ✅ | Pilih: **Receive** atau **Putaway** |
| 6 | Qty | ✅ | Jumlah barang yang diproses |
| 7 | Operator | ✅ | Nama operator yang melakukan transaksi |

4. Klik **OK** untuk menyimpan

> **Catatan:** Setelah menambahkan transaction dengan Receipt No yang sudah ada di Inbound Arrival, maka kolom **Receive Qty**, **Putaway Qty**, **Pending Qty**, dan **Status** di halaman Arrival akan terupdate otomatis.

---

### 2.2 Add via Import CSV (Massal)

1. Buka menu **Inbound → Inbound Transaction**
2. Klik tombol **Template** untuk download template CSV
3. Buka file template di Excel / Google Sheets
4. Isi data sesuai kolom:

| Kolom | Format | Contoh |
|-------|--------|--------|
| `date` | YYYY-MM-DD | 2026-02-20 |
| `time_transaction` | YYYY-MM-DD HH:mm:ss | 2026-02-20 10:15:30 |
| `receipt_no` | Teks | A2213 |
| `sku` | Teks | SKU-12345 |
| `operate_type` | Teks (receive / putaway) | receive |
| `qty` | Angka | 500 |
| `operator` | Teks | Budi |

5. Simpan file sebagai format **CSV (Comma Separated Values)**
6. Klik tombol **Import** → pilih file CSV yang sudah diisi
7. Tunggu proses import selesai — akan muncul notifikasi "✅ X data berhasil diimport"

> **Penting:**
> - Data lama **tidak akan terhapus** saat import. Data baru ditambahkan.
> - Kolom `operate_type` hanya boleh diisi **receive** atau **putaway** (huruf kecil).
> - Pastikan `receipt_no` sama persis dengan di Inbound Arrival agar kalkulasi otomatis berjalan.

---

## Tips Umum

| Fitur | Cara Akses |
|-------|------------|
| **Template** | Klik tombol **Template** → download file CSV kosong dengan header yang benar |
| **Import** | Klik tombol **Import** → pilih file CSV |
| **Export** | Klik tombol **Export** → download semua data dalam format CSV |
| **Edit** | Klik icon ✏️ di kolom Actions pada baris yang ingin diedit |
| **Hapus** | Klik icon 🗑️ di kolom Actions → konfirmasi hapus |
| **Hapus Massal** | Centang baris yang ingin dihapus → klik tombol **Hapus (X)** |
| **Filter Tanggal** | Gunakan date picker atau klik **Bulan Ini** / **Bulan Lalu** |
| **Cari Data** | Ketik keyword di kolom **Search** |
| **Refresh** | Klik tombol **Refresh** (data juga auto-refresh setiap 30 detik) |

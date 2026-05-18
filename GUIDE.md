# Panduan Pemasangan Web Prepare Outdoor (GitHub + Spreadsheet)

Panduan ini menjelaskan langkah demi langkah cara memasang aplikasi ini menggunakan **GitHub Pages** sebagai hosting dan **Google Spreadsheet** sebagai database.

---

## Langkah 1: Persiapan Google Spreadsheet

Aplikasi ini menggunakan Google Spreadsheet untuk menyimpan data. Anda perlu membuat spreadsheet baru dengan struktur kolom berikut:

### 1. Tab `Products` (Daftar Barang)
Buat sheet bernama `Products` dengan kolom:
| id | name | price | stock | category | type | description | imageUrl | isActive | barcode |
|----|------|-------|-------|----------|------|-------------|----------|----------|---------|
| 1  | Tenda Dome | 50000 | 10 | Tenda | rent | Tenda 4 orang | (url gambar) | TRUE | (barcode) |

### 2. Tab `Transactions` (Riwayat Selesai)
Buat sheet bernama `Transactions` dengan kolom:
| id | date | time | customerName | customerPhone | subtotal | globalDiscount | totalAmount | type | paymentMethod | items | startDate | endDate | timestamp |
|----|------|------|--------------|---------------|----------|----------------|-------------|------|---------------|-------|-----------|---------|-----------|

### 3. Tab `Promotions` (Daftar Promo)
Buat sheet bernama `Promotions` dengan kolom:
| id | name | type | value | targetItemId | minPurchase | buyQty | getQty | isActive |
|----|------|------|-------|--------------|-------------|--------|--------|----------|

---

## Langkah 2: Setup Google Apps Script (Backend)

Google Apps Script berfungsi sebagai "jembatan" antara Web Anda dan Spreadsheet.

1. Buka Spreadsheet Anda, lalu menu **Extensions** > **Apps Script**.
2. Hapus kode yang ada, lalu salin kode backend (lihat di bawah).
3. Klik **Deploy** > **New Deployment**.
4. Pilih type: **Web App**.
5. Konfigurasi:
   - Description: "API Prepare Outdoor"
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Klik **Deploy**, lalu salin **Web App URL** yang muncul (akhiran `/exec`).

### Kode Backend (Apps Script):
```javascript
const SS = SpreadsheetApp.getActiveSpreadsheet();

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  const payload = data.payload;
  const id = data.id;

  let result = { success: false };

  try {
    if (action === 'getProducts') {
      result = getSheetData('Products');
    } else if (action === 'addProduct') {
      result = addDataToSheet('Products', payload);
    } else if (action === 'updateProduct') {
      result = updateDataInSheet('Products', id, payload);
    } else if (action === 'createBooking') {
      result = addDataToSheet('Transactions', payload);
    }
    // ... Tambahkan aksi lainnya sesuai kebutuhan
  } catch (err) {
    result = { success: false, error: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(sheetName) {
  const sheet = SS.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function addDataToSheet(sheetName, payload) {
  const sheet = SS.getSheetByName(sheetName);
  const headers = sheet.getDataRange().getValues()[0];
  const newRow = headers.map(h => payload[h] || "");
  sheet.appendRow(newRow);
  return { success: true };
}
```

---

## Langkah 3: Konfigurasi di Project Web

1. Di komputer lokal Anda, buat file `.env` (copy dari `.env.example`).
2. Isi `VITE_GAS_URL` dengan URL yang Anda dapatkan dari Langkah 2.
   ```
   VITE_GAS_URL=https://script.google.com/macros/s/BAIA_ID_ANDA/exec
   ```

---

## Langkah 4: Deploy ke GitHub Pages

1. Buat repository Baru di GitHub.
2. Push kode Anda ke GitHub.
3. Di tab **Settings** repository Anda:
   - Pilih menu **Pages**.
   - Pada **Build and deployment**, pilih **GitHub Actions**.
4. Gunakan workflow standar untuk Vite/React:
   - Buat file `.github/workflows/deploy.yml`.
   - Pastikan Anda menambahkan **Secrets** di GitHub untuk menyimpan `VITE_GAS_URL` jika tidak ingin diekspos di file publik.

---

## Catatan Penting
- Pastikan semua tab di Spreadsheet memiliki Nama yang **Tepat** (Case Sensitive).
- Spreadsheet bertindak sebagai database permanen, sedangkan **Local Storage** (Mode Mock) hanya untuk simulasi sementara.
- Gunakan `npm run build` untuk menghasilkan folder `dist/` yang siap di-upload ke hosting.

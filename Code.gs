/**
 * PREPARE OUTDOOR BACKEND - GOOGLE APPS SCRIPT
 * Database: Google Sheets
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();
const SHEET_PRODUK = SS.getSheetByName('produk');
const SHEET_PESANAN = SS.getSheetByName('pesanan');

function doGet(e) {
  return ContentService.createTextOutput("Prepare Outdoor API is Running")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'getProducts') return handleResponse(getProducts());
    if (action === 'getBooking') return handleResponse(getBooking(data.id));
    if (action === 'createBooking') return handleResponse(createBooking(data.payload));
    if (action === 'updateStatus') return handleResponse(updateStatus(data.id, data.status));

    return handleResponse({ error: 'Action not found' });
  } catch (err) {
    return handleResponse({ error: err.toString() });
  }
}

function handleResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- LOGIKA DATA ---

function getProducts() {
  const data = SHEET_PRODUK.getDataRange().getValues();
  const headers = data.shift();
  return data.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  }).filter(p => p.isActive === true || p.isActive === "TRUE");
}

function createBooking(payload) {
  const id = 'TRX-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  const timestamp = new Date();
  
  SHEET_PESANAN.appendRow([
    id,
    payload.customerName,
    payload.customerEmail,
    JSON.stringify(payload.items),
    payload.startDate,
    payload.endDate,
    payload.totalAmount,
    'paid', // Langsung paid untuk simulasi QRIS
    payload.jaminan,
    timestamp
  ]);
  
  return { success: true, id: id };
}

function getBooking(id) {
  const data = SHEET_PESANAN.getDataRange().getValues();
  const headers = data.shift();
  const row = data.find(r => r[0] === id);
  
  if (!row) return { error: 'Not found' };
  
  let obj = {};
  headers.forEach((h, i) => obj[h] = row[i]);
  obj.items = JSON.parse(obj.items);
  return obj;
}

function updateStatus(id, status) {
  const data = SHEET_PESANAN.getDataRange().getValues();
  let rowIndex = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) return { error: 'Not found' };
  
  // Status di kolom H (index 8)
  SHEET_PESANAN.getRange(rowIndex, 8).setValue(status);
  
  // Jika Return, bisa tambah logika restock di sini
  return { success: true };
}

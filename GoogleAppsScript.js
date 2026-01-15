/**
 * ==========================================
 * KODE BACKEND GOOGLE APPS SCRIPT (GAS)
 * ==========================================
 * 
 * VERSI: 4.0 (Link Only Support)
 * 
 * Update: 
 * - Menyederhanakan handleSaveMail untuk mendukung penyimpanan URL Manual.
 * - Memastikan kolom H terisi link dari input frontend.
 */

// --- KONFIGURASI ---
const SHEET_USERS = "Login";
const SHEET_INCOMING = "Surat Masuk";
const SHEET_OUTGOING = "Surat Keluar";

// --- FUNGSI UTAMA (DO POST) ---
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    setupDatabase(); // Pastikan sheet ada

    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result = {};

    if (action === "login") {
      result = handleLogin(data.username, data.password);
    } else if (action === "getMails") {
      result = handleGetMails();
    } else if (action === "saveMail") {
      // Simpan Surat
      result = handleSaveMail(data.mail);
    } else if (action === "deleteMail") {
      result = handleDeleteMail(data.id);
    } else {
      result = { success: false, message: "Action tidak dikenal" };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      message: "Server Error: " + error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput("ArsipPro API is Running. Ready.");
}

// --- FUNGSI SETUP ---
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Setup Sheet Login
  let userSheet = ss.getSheetByName(SHEET_USERS);
  if (!userSheet) {
    userSheet = ss.insertSheet(SHEET_USERS);
    userSheet.appendRow(["Id", "Nama", "Jabatan", "Role", "Username", "Password"]);
    userSheet.appendRow(["1", "Super Admin", "Kepala Bagian", "ADMIN", "admin", "admin123"]);
    userSheet.appendRow(["2", "Staf Arsip", "Staf Administrasi", "USER", "user", "user123"]);
  }

  // Header
  const headers = ["No (System ID)", "Tanggal Surat", "No Surat", "Dikirim Kepada / Diterima Dari", "Perihal", "Hubungan Dengan Surat Lain", "Kode Arsip", "Link File", "Keterangan"];

  // 2. Setup Sheet Surat Masuk
  let inSheet = ss.getSheetByName(SHEET_INCOMING);
  if (!inSheet) {
    inSheet = ss.insertSheet(SHEET_INCOMING);
    inSheet.appendRow(headers);
  }

  // 3. Setup Sheet Surat Keluar
  let outSheet = ss.getSheetByName(SHEET_OUTGOING);
  if (!outSheet) {
    outSheet = ss.insertSheet(SHEET_OUTGOING);
    outSheet.appendRow(headers);
  }
}

// --- LOGIC HANDLERS ---

function handleLogin(username, password) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  if (!sheet) return { success: false, message: "Database user tidak ditemukan." };
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[4]) === username && String(row[5]) === password) {
      return { 
        success: true, 
        user: { 
          id: String(row[0]),
          name: row[1],
          position: row[2],
          role: row[3],
          username: row[4]
        } 
      };
    }
  }
  return { success: false, message: "Username atau Password salah" };
}

function handleGetMails() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mails = [];

  const processSheet = (sheetName, type) => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) { 
        mails.push({
          id: String(row[0]),
          date: formatDate(row[1]),
          referenceNumber: String(row[2]),
          recipient: String(row[3]),
          subject: String(row[4]),
          relatedTo: String(row[5] || ""),
          archiveCode: String(row[6] || ""),
          // Pastikan kolom H (index 7) dibaca
          fileLink: String(row[7] || ""),
          description: String(row[8] || ""),
          type: type 
        });
      }
    }
  };

  processSheet(SHEET_INCOMING, 'INCOMING');
  processSheet(SHEET_OUTGOING, 'OUTGOING');
  mails.sort((a, b) => new Date(b.date) - new Date(a.date));

  return { success: true, mails: mails };
}

function handleSaveMail(mail) {
  // Hapus data lama jika ada (mode edit)
  handleDeleteMail(mail.id);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetSheetName = mail.type === 'INCOMING' ? SHEET_INCOMING : SHEET_OUTGOING;
  let sheet = ss.getSheetByName(targetSheetName);

  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName(targetSheetName);
  }

  // Generate Kode Arsip jika belum ada
  let archiveCode = mail.archiveCode;
  if (!archiveCode || archiveCode.trim() === "") {
    archiveCode = generateUniqueCode();
  }

  // Ambil Link File dari input user (Kolom H)
  // Pastikan tidak undefined
  const finalFileLink = mail.fileLink || "";

  const rowData = [
    mail.id,                       // Col A
    "'" + mail.date,               // Col B
    "'" + mail.referenceNumber,    // Col C
    mail.recipient,                // Col D
    mail.subject,                  // Col E
    mail.relatedTo || "-",         // Col F
    archiveCode,                   // Col G
    finalFileLink,                 // Col H (Link File)
    mail.description || ""         // Col I
  ];
  
  sheet.appendRow(rowData);

  return { 
    success: true, 
    archiveCode: archiveCode, 
    fileLink: finalFileLink,
    message: "Data tersimpan."
  };
}

function handleDeleteMail(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const deleteFromSheet = (sheetName) => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return false;
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        return true;
      }
    }
    return false;
  };

  deleteFromSheet(SHEET_INCOMING);
  deleteFromSheet(SHEET_OUTGOING);
  return { success: true };
}

function generateUniqueCode() {
  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd");
  const randomStr = Math.floor(Math.random() * 9000 + 1000).toString();
  return "ARS-" + dateStr + "-" + randomStr;
}

function formatDate(dateVal) {
  if (!dateVal) return "";
  try {
    if (dateVal instanceof Date) {
      return Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    return String(dateVal).substring(0, 10);
  } catch (e) {
    return "";
  }
}
/**
 * ==========================================
 * KODE BACKEND GOOGLE APPS SCRIPT (GAS)
 * ==========================================
 * 
 * Update: Struktur Sheet Terpisah (Login, Surat Masuk, Surat Keluar)
 * Ditambah kolom untuk Link File dan Keterangan.
 * Update Terbaru: Auto-generate Kode Arsip Unik & Return Code.
 * Update Upload: Integrasi DriveApp untuk upload file base64.
 */

// --- KONFIGURASI NAMA SHEET ---
const SHEET_USERS = "Login";
const SHEET_INCOMING = "Surat Masuk";
const SHEET_OUTGOING = "Surat Keluar";
const FOLDER_NAME = "ArsipPro_Files"; // Nama folder di Google Drive

// --- FUNGSI UTAMA (DO POST) ---
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    // Jalankan setup database otomatis jika sheet belum ada
    setupDatabase();

    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result = {};

    if (action === "login") {
      result = handleLogin(data.username, data.password);
    } else if (action === "getMails") {
      result = handleGetMails();
    } else if (action === "saveMail") {
      // Kirim seluruh data (mail + fileData optional)
      result = handleSaveMail(data.mail, data.fileData);
    } else if (action === "deleteMail") {
      result = handleDeleteMail(data.id);
    } else {
      result = { success: false, message: "Action tidak dikenal" };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput("ArsipPro API is Running.");
}

// --- SETUP DATABASE ---
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

  // Header Surat Lengkap (9 Kolom)
  // 0:No, 1:Tgl, 2:NoSurat, 3:Kepada/Dari, 4:Perihal, 5:Hubungan, 6:Kode, 7:Link, 8:Ket
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
  if (!sheet) return { success: false, message: "Sheet Login tidak ditemukan." };
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Username (Indeks 4), Password (Indeks 5)
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
    
    // Skip header (i=1)
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
          fileLink: String(row[7] || ""),      // Kolom 8: Link File
          description: String(row[8] || ""),   // Kolom 9: Keterangan
          type: type 
        });
      }
    }
  };

  processSheet(SHEET_INCOMING, 'INCOMING');
  processSheet(SHEET_OUTGOING, 'OUTGOING');

  // Urutkan berdasarkan tanggal terbaru
  mails.sort((a, b) => new Date(b.date) - new Date(a.date));

  return { success: true, mails: mails };
}

function handleSaveMail(mail, fileData) {
  // Hapus data lama jika ID sama (Update mechanism)
  handleDeleteMail(mail.id);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetSheetName = mail.type === 'INCOMING' ? SHEET_INCOMING : SHEET_OUTGOING;
  let sheet = ss.getSheetByName(targetSheetName);

  if (!sheet) {
    setupDatabase(); // Buat sheet jika hilang
    sheet = ss.getSheetByName(targetSheetName);
  }

  // Generate Unique Archive Code if empty
  let archiveCode = mail.archiveCode;
  if (!archiveCode || archiveCode.trim() === "") {
    archiveCode = generateUniqueCode();
  }

  // --- HANDLE FILE UPLOAD ---
  let fileLink = mail.fileLink || "";
  if (fileData && fileData.content) {
    try {
      // Decode Base64
      const decoded = Utilities.base64Decode(fileData.content);
      const blob = Utilities.newBlob(decoded, fileData.mimeType, fileData.name);
      
      // Get or Create Folder
      const folder = getOrCreateFolder(FOLDER_NAME);
      
      // Create File
      const file = folder.createFile(blob);
      
      // Set Permission (Anyone with link can view)
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      // Get URL
      fileLink = file.getUrl(); // Atau file.getDownloadUrl() untuk direct download
    } catch (e) {
      // Jika upload gagal, kita log errornya tapi tetap simpan data surat
      console.error("Upload Error: " + e.toString()); 
    }
  }

  const rowData = [
    mail.id,
    "'" + mail.date,             // Pakai kutip agar format tanggal text terjaga
    "'" + mail.referenceNumber,  // Pakai kutip agar angka 0 di depan tidak hilang
    mail.recipient,
    mail.subject,
    mail.relatedTo || "-",
    archiveCode,                 // Gunakan kode yang sudah dipastikan ada
    fileLink,                    // Link file hasil upload atau input manual
    mail.description || ""
  ];
  
  sheet.appendRow(rowData);

  // Return generated code & file link so frontend can update UI immediately
  return { success: true, archiveCode: archiveCode, fileLink: fileLink };
}

function handleDeleteMail(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const deleteFromSheet = (sheetName) => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return false;
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      // Cek ID (Kolom A / Index 0)
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1); // Row di spreadsheet mulai dari 1
        return true;
      }
    }
    return false;
  };

  // Coba hapus di kedua sheet
  deleteFromSheet(SHEET_INCOMING);
  deleteFromSheet(SHEET_OUTGOING);

  return { success: true };
}

// Helper: Get or Create Drive Folder
function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}

// Generate kode arsip unik: ARS-YYYYMMDD-XXXX
function generateUniqueCode() {
  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd");
  const randomStr = Math.floor(Math.random() * 9000 + 1000).toString(); // 4 digit random
  return "ARS-" + dateStr + "-" + randomStr;
}

function formatDate(dateVal) {
  if (!dateVal) return "";
  try {
    // Jika input adalah object Date Google Sheet
    if (dateVal instanceof Date) {
      return Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    // Jika string ISO atau format lain
    return String(dateVal).substring(0, 10);
  } catch (e) {
    return "";
  }
}
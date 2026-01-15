import { User, Mail, MailType, Role } from '../types';

// URL Database Spreadsheet (Google Apps Script Web App URL)
// GANTI URL DI BAWAH INI DENGAN URL DARI LANGKAH DEPLOY GOOGLE APPS SCRIPT
// Format URL harus berakhiran '/exec'
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzkSCyz9r2WNwOH4XTPWAR1Y_SIVuvqyk0Mxf7iSufn68_0pJipvBP614JZviAEmag0/exec'; 

// Helper function to validate URL
const isValidScriptUrl = (url: string): boolean => {
  return typeof url === 'string' && url.startsWith('https://script.google.com/') && url.includes('/exec');
};

// Data Dummy untuk Mode Demo
const DEMO_USER_ADMIN: User = { username: 'admin', role: Role.ADMIN, name: 'Super Admin', position: 'Kepala Bagian Umum' };
const DEMO_USER_STAFF: User = { username: 'user', role: Role.USER, name: 'Staf Arsip', position: 'Staf Administrasi' };

const DEMO_MAILS: Mail[] = [
  {
    id: '1',
    date: '2024-03-20',
    referenceNumber: 'SK/2024/001',
    recipient: 'Kepala Dinas',
    subject: 'Undangan Rapat Koordinasi Tahunan',
    relatedTo: '-',
    archiveCode: 'UND-01',
    type: MailType.INCOMING,
    fileLink: '',
    description: 'Segera ditindaklanjuti'
  },
  {
    id: '2',
    date: '2024-03-21',
    referenceNumber: 'OUT/2024/055',
    recipient: 'CV. Maju Jaya',
    subject: 'Pemberitahuan Pemenang Tender',
    relatedTo: 'SK/2024/001',
    archiveCode: 'PENG-02',
    type: MailType.OUTGOING,
    fileLink: 'https://example.com/doc.pdf',
    description: ''
  },
  {
    id: '3',
    date: '2024-03-22',
    referenceNumber: 'SK/2024/002',
    recipient: 'Bupati',
    subject: 'Laporan Bulanan Kegiatan',
    relatedTo: '-',
    archiveCode: 'LAP-01',
    type: MailType.INCOMING,
    fileLink: '',
    description: ''
  }
];

interface FilePayload {
  name: string;
  mimeType: string;
  content: string; // Base64 encoded string
}

export const sheetApi = {
  login: async (username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
    // 1. Cek Mode Demo Eksplisit (URL Default/Invalid)
    if (GOOGLE_SCRIPT_URL.includes('PASTE_YOUR') || !isValidScriptUrl(GOOGLE_SCRIPT_URL)) {
      console.warn("URL Database belum valid. Menggunakan Mode Demo.");
      if (username === 'admin' && password === 'admin123') return { success: true, user: DEMO_USER_ADMIN };
      if (username === 'user' && password === 'user123') return { success: true, user: DEMO_USER_STAFF };
      return { success: false, message: 'Login Gagal (Mode Demo: admin/admin123)' };
    }

    // 2. Coba Fetch ke Backend
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
            "Content-Type": "text/plain",
        },
        body: JSON.stringify({ action: 'login', username, password }),
      });
      
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.warn("Invalid JSON response from server:", text.substring(0, 50));
        throw new Error("Server returned invalid JSON");
      }
    } catch (error) {
      console.error("Gagal fetch, fallback ke demo:", error);
      // Fallback jika fetch error (misal offline atau CORS block)
      if (username === 'admin' && password === 'admin123') return { success: true, user: DEMO_USER_ADMIN };
      if (username === 'user' && password === 'user123') return { success: true, user: DEMO_USER_STAFF };
      
      return { success: false, message: 'Gagal terhubung ke server. Mode Demo aktif: gunakan admin/admin123' };
    }
  },

  getMails: async (): Promise<Mail[]> => {
    // 1. Cek Mode Demo
    if (!isValidScriptUrl(GOOGLE_SCRIPT_URL) || GOOGLE_SCRIPT_URL.includes('PASTE_YOUR')) {
      return DEMO_MAILS;
    }
    
    // 2. Fetch Backend
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
            "Content-Type": "text/plain",
        },
        body: JSON.stringify({ action: 'getMails' }),
      });
      
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        return data.success ? data.mails : [];
      } catch (e) {
        console.warn("Invalid JSON response from server:", text.substring(0, 50));
        throw new Error("Server returned invalid JSON");
      }
    } catch (error) {
      console.error("Gagal fetch mails, fallback ke demo.");
      return DEMO_MAILS;
    }
  },

  saveMail: async (mail: Mail, file?: FilePayload): Promise<{ success: boolean; archiveCode?: string; fileLink?: string }> => {
    if (!isValidScriptUrl(GOOGLE_SCRIPT_URL) || GOOGLE_SCRIPT_URL.includes('PASTE_YOUR')) {
      // alert("Mode Demo: Data disimpan sementara di memori browser.");
      return { success: true, archiveCode: mail.archiveCode || 'DEMO-CODE-' + Date.now(), fileLink: file ? 'https://dummy-drive-link.com/file.pdf' : undefined };
    }

    try {
      // Create request payload
      const payload: any = { action: 'saveMail', mail };
      
      // Attach file data if present
      if (file) {
        payload.fileData = file;
      }

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
            "Content-Type": "text/plain",
        },
        body: JSON.stringify(payload),
      });
      
      const text = await res.text();
      const data = JSON.parse(text);
      
      // data.archiveCode & fileLink will be returned from GAS
      return { success: data.success, archiveCode: data.archiveCode, fileLink: data.fileLink };
    } catch (error) {
      console.error("Save error:", error);
      alert("Gagal koneksi ke Spreadsheet (Failed to fetch).");
      return { success: false };
    }
  },

  deleteMail: async (id: string): Promise<boolean> => {
    if (!isValidScriptUrl(GOOGLE_SCRIPT_URL) || GOOGLE_SCRIPT_URL.includes('PASTE_YOUR')) return true;

    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
            "Content-Type": "text/plain",
        },
        body: JSON.stringify({ action: 'deleteMail', id }),
      });
      const data = await res.json();
      return data.success;
    } catch (error) {
      console.error(error);
      return true; // Optimistic success
    }
  }
};
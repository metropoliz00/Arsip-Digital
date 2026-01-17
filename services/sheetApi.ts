import { User, Mail, MailType, Role } from '../types';

/**
 * PANDUAN HOSTING:
 * 1. Deploy Google Apps Script Anda sebagai 'Web App'.
 * 2. Set 'Who has access' ke 'Anyone'.
 * 3. Salin URL-nya dan tempel di variabel GOOGLE_SCRIPT_URL di bawah ini.
 */
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyR1PCNc7giDI8ifs3Mx_IoF4aoG4xq4gkz0gKQo-WXqgIuJK287O4rSwN5DF8pcPNL/exec'; 

// Validasi URL untuk memastikan aplikasi tidak crash jika URL salah
const isValidScriptUrl = (url: string): boolean => {
  return typeof url === 'string' && url.startsWith('https://script.google.com/') && url.includes('/exec');
};

// Data Cadangan untuk Mode Demo (jika API belum terhubung)
const DEMO_USER_ADMIN: User = { username: 'admin', role: Role.ADMIN, name: 'Super Admin', position: 'Kepala Bagian Umum' };
const DEMO_USER_STAFF: User = { username: 'user', role: Role.USER, name: 'Staf Arsip', position: 'Staf Administrasi' };

const DEMO_MAILS: Mail[] = [
  {
    id: '1',
    date: '2024-03-20',
    referenceNumber: 'SK/2024/001',
    recipient: 'Kepala Dinas',
    subject: 'Undangan Rapat Koordinasi Tahunan (Demo)',
    relatedTo: '-',
    archiveCode: 'UND-01',
    type: MailType.INCOMING,
    fileLink: '',
    description: 'Segera ditindaklanjuti'
  }
];

interface FilePayload {
  name: string;
  mimeType: string;
  content: string; 
}

export const sheetApi = {
  login: async (username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
    // Gunakan mode demo jika URL belum diset atau tidak valid
    if (!isValidScriptUrl(GOOGLE_SCRIPT_URL) || GOOGLE_SCRIPT_URL.includes('KODE_ANDA')) {
      console.warn("Mode Demo Aktif: Gunakan admin/admin123");
      if (username === 'admin' && password === 'admin123') return { success: true, user: DEMO_USER_ADMIN };
      if (username === 'user' && password === 'user123') return { success: true, user: DEMO_USER_STAFF };
      return { success: false, message: 'Username/Password salah (Mode Demo)' };
    }

    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: 'login', username, password }),
      });
      
      const result = await res.json();
      if (result.success && result.user) {
        result.user.role = result.user.role.toUpperCase() as Role;
      }
      return result;
    } catch (error) {
      console.error("Koneksi gagal:", error);
      return { success: false, message: 'Gagal terhubung ke database. Pastikan internet aktif.' };
    }
  },

  getMails: async (): Promise<Mail[]> => {
    if (!isValidScriptUrl(GOOGLE_SCRIPT_URL)) return DEMO_MAILS;
    
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: 'getMails' }),
      });
      
      const data = await res.json();
      return data.success ? data.mails : [];
    } catch (error) {
      console.error("Gagal memuat data:", error);
      return DEMO_MAILS;
    }
  },

  saveMail: async (mail: Mail, file?: FilePayload): Promise<{ success: boolean; archiveCode?: string; fileLink?: string }> => {
    if (!isValidScriptUrl(GOOGLE_SCRIPT_URL)) {
      return { success: true, archiveCode: 'DEMO-' + Date.now() };
    }

    try {
      const payload: any = { action: 'saveMail', mail };
      if (file) payload.fileData = file;

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });
      
      return await res.json();
    } catch (error) {
      console.error("Gagal menyimpan:", error);
      return { success: false };
    }
  },

  deleteMail: async (id: string): Promise<boolean> => {
    if (!isValidScriptUrl(GOOGLE_SCRIPT_URL)) return true;

    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: 'deleteMail', id }),
      });
      const data = await res.json();
      return data.success;
    } catch (error) {
      return false;
    }
  }
};
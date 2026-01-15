import React from 'react';

export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum MailType {
  INCOMING = 'INCOMING', // Surat Masuk
  OUTGOING = 'OUTGOING'  // Surat Keluar
}

// Status dihapus dari UI karena tidak ada di kolom spreadsheet yang diminta
// Namun kita simpan enum jika nanti dibutuhkan logika internal
export enum MailStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  ARCHIVED = 'ARCHIVED'
}

export interface User {
  id?: string;
  name: string;      // Nama
  position: string;  // Jabatan (Baru)
  role: Role;        // Role
  username: string;  // Username
  password?: string; // Password (frontend doesn't usually store this, but mapped from sheet)
}

export interface Mail {
  id: string;              // No (System ID)
  date: string;            // Tanggal Surat
  referenceNumber: string; // No Surat
  recipient: string;       // Dikirim Kepada (Keluar) / Diterima Dari (Masuk)
  subject: string;         // Perihal
  relatedTo: string;       // Hubungan Dengan Surat Lain (Baru)
  archiveCode: string;     // Kode Arsip (Baru)
  type: MailType;          // Pembeda Sheet (Masuk/Keluar)
  fileLink?: string;       // Link Dokumen (Baru)
  description?: string;    // Keterangan/Disposisi (Baru)
}

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color: string;
}
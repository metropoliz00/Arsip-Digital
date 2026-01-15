import React, { useState, useEffect, useMemo } from 'react';
import { 
  Archive, 
  Inbox, 
  Send, 
  Search, 
  Plus, 
  LogOut, 
  LogIn,
  User as UserIcon, 
  LayoutDashboard, 
  FileText, 
  Trash2, 
  Edit, 
  Eye, 
  EyeOff,
  Lock,
  CheckCircle,
  Clock,
  Loader2,
  Briefcase,
  Link as LinkIcon,
  Hash,
  PenTool,
  Paperclip,
  AlignLeft,
  ExternalLink,
  UploadCloud
} from 'lucide-react';
import { Role, Mail, MailType, User } from './types';
import { sheetApi } from './services/sheetApi'; // Import API Service
import { StatCard } from './components/StatCard';
import { Modal } from './components/Modal';

// --- APP COMPONENT ---

const App: React.FC = () => {
  // State: Auth
  const [user, setUser] = useState<User | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // State: Data
  const [mails, setMails] = useState<Mail[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // State: View & UI
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'INCOMING' | 'OUTGOING'>('DASHBOARD');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingMail, setEditingMail] = useState<Mail | null>(null);
  const [viewingMail, setViewingMail] = useState<Mail | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // State: File Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<Mail>>({
    referenceNumber: '',
    date: new Date().toISOString().split('T')[0],
    recipient: '',
    subject: '',
    relatedTo: '',
    archiveCode: '',
    type: MailType.INCOMING,
    fileLink: '',
    description: ''
  });

  // --- EFFECTS ---
  
  // Load data when user logs in
  useEffect(() => {
    if (user) {
      loadMails();
    }
  }, [user]);

  const loadMails = async () => {
    setIsLoadingData(true);
    const data = await sheetApi.getMails();
    setMails(data);
    setIsLoadingData(false);
  };

  // --- HANDLERS: AUTH ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    const result = await sheetApi.login(usernameInput, passwordInput);
    
    if (result.success && result.user) {
      setUser(result.user);
    } else {
      setLoginError(result.message || 'Login gagal.');
    }
    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('DASHBOARD');
    setUsernameInput('');
    setPasswordInput('');
    setMails([]); // Clear sensitive data
  };

  // --- HANDLERS: CRUD ---
  // Update: Accepts optional type to force specific form mode
  const handleOpenAdd = (targetType?: MailType) => {
    setEditingMail(null);
    setSelectedFile(null); // Reset file
    setFileError('');
    
    // Determine type: use targetType if provided, otherwise infer from current view
    const type = targetType || (currentView === 'OUTGOING' ? MailType.OUTGOING : MailType.INCOMING);

    setFormData({
      referenceNumber: '',
      date: new Date().toISOString().split('T')[0],
      recipient: '',
      subject: '',
      relatedTo: '',
      archiveCode: '',
      type: type,
      fileLink: '',
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (mail: Mail) => {
    setEditingMail(mail);
    setSelectedFile(null); // Reset file
    setFileError('');
    setFormData({ ...mail });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus arsip ini?')) {
      // Optimistic update
      const prevMails = [...mails];
      setMails(prev => prev.filter(m => m.id !== id));
      
      const success = await sheetApi.deleteMail(id);
      if (!success) {
        alert("Gagal menghapus dari database.");
        setMails(prevMails); // Revert
      }
    }
  };

  const handleView = (mail: Mail) => {
    setViewingMail(mail);
    setIsViewModalOpen(true);
  };

  // --- HANDLER: FILE UPLOAD ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError('');
    
    if (file) {
      // Limit 4MB agar aman dikirim via GAS TextOutput/JSON
      if (file.size > 4 * 1024 * 1024) {
        setFileError('Ukuran file maksimal 4MB');
        setSelectedFile(null);
        e.target.value = ''; // Reset input
        return;
      }
      setSelectedFile(file);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const result = reader.result as string;
        const base64 = result.split(',')[1]; 
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fileError) return;

    setIsSaving(true);
    
    let mailToSave: Mail;

    if (editingMail) {
      // Update object
      mailToSave = { ...formData, id: editingMail.id } as Mail;
    } else {
      // Create new object
      // Safe fallback for UUID generation
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Date.now().toString() + Math.random().toString(36).substring(2);

      mailToSave = {
        ...formData,
        id: newId, 
      } as Mail;
    }

    // Prepare File Data if exists
    let filePayload = undefined;
    if (selectedFile) {
      try {
        const base64Content = await convertFileToBase64(selectedFile);
        filePayload = {
          name: selectedFile.name,
          mimeType: selectedFile.type,
          content: base64Content
        };
      } catch (err) {
        console.error("Gagal convert file", err);
        alert("Gagal memproses file upload.");
        setIsSaving(false);
        return;
      }
    }

    // Call API
    const result = await sheetApi.saveMail(mailToSave, filePayload);

    if (result.success) {
      // If backend returned a generated code and our local one was empty, update it
      if (result.archiveCode) {
        mailToSave.archiveCode = result.archiveCode;
      }
      // If backend returned a file link (from Drive), update it
      if (result.fileLink) {
        mailToSave.fileLink = result.fileLink;
      }

      if (editingMail) {
        setMails(prev => prev.map(m => m.id === mailToSave.id ? mailToSave : m));
      } else {
        setMails(prev => [mailToSave, ...prev]);
      }
      setIsModalOpen(false);
    } else {
      alert("Gagal menyimpan ke database Google Sheet. Pastikan script URL benar.");
    }
    setIsSaving(false);
  };

  // --- DATA FILTERING ---
  const filteredMails = useMemo(() => {
    let result = mails;
    if (currentView === 'INCOMING') result = result.filter(m => m.type === MailType.INCOMING);
    if (currentView === 'OUTGOING') result = result.filter(m => m.type === MailType.OUTGOING);
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(m => 
        m.subject.toLowerCase().includes(lower) || 
        m.referenceNumber.toLowerCase().includes(lower) ||
        m.recipient.toLowerCase().includes(lower) ||
        m.archiveCode.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [mails, currentView, searchTerm]);

  const stats = useMemo(() => {
    return {
      incoming: mails.filter(m => m.type === MailType.INCOMING).length,
      outgoing: mails.filter(m => m.type === MailType.OUTGOING).length,
      recent: mails.slice(0, 5).length
    };
  }, [mails]);

  // --- LOGIN SCREEN ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50 relative overflow-hidden">
        {/* Modern Background Motif (Blobs) */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-20 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/50 relative z-10 transition-all hover:shadow-brand-500/10">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-tr from-brand-500 to-brand-600 p-5 rounded-2xl shadow-lg shadow-brand-500/30 mb-5 transform -rotate-3 transition-transform hover:rotate-0 duration-300 group">
              <Send size={42} className="text-white transform group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">Arsip Digital</h2>
            <p className="text-gray-500 font-medium text-sm mt-2">Smart Digital Archives Management</p>
            <p className="text-brand-600 font-bold text-xs mt-1 uppercase tracking-wide">UPT SD Negeri Remen 2</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide ml-1">Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                </div>
                <input
                  type="text"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:bg-white outline-none transition-all duration-200"
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  placeholder="Masukkan username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-12 pr-12 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:bg-white outline-none transition-all duration-200"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="Masukkan password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-brand-600 focus:outline-none cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="flex items-center space-x-2 bg-red-50 text-red-500 text-sm p-3 rounded-lg border border-red-100 animate-pulse">
                <CheckCircle size={16} className="transform rotate-45" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all transform hover:-translate-y-0.5 active:scale-[0.98] duration-200 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <span>Login</span>
                  <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            
            {/* Animated Server Status - Only visible when logging in */}
            {isLoggingIn && (
              <div className="flex items-center justify-center space-x-2 mt-4">
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </div>
                <span className="text-xs text-gray-500 font-medium animate-pulse">
                  Terhubung dengan server...
                </span>
              </div>
            )}
          </form>
        </div>
        
        {/* Footer Credit */}
        <div className="absolute bottom-6 text-center w-full text-brand-900/40 text-xs font-medium">
          @ 2026 Dev Dedy Meyga Saputra, S.Pd, M.Pd
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 flex items-center space-x-3 border-b border-gray-100">
          <div className="bg-brand-600 p-2 rounded-lg text-white shadow-lg shadow-brand-500/30">
            <Send size={24} className="transform -rotate-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight leading-none">Arsip Digital</h1>
            <p className="text-[10px] font-bold text-brand-600 mt-1 uppercase tracking-wide">UPT SD Negeri Remen 2</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setCurrentView('DASHBOARD')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentView === 'DASHBOARD' ? 'bg-brand-50 text-brand-600 font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <LayoutDashboard size={20} />
            <span>Dasbor</span>
          </button>
          <button
            onClick={() => setCurrentView('INCOMING')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentView === 'INCOMING' ? 'bg-brand-50 text-brand-600 font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Inbox size={20} />
            <span>Surat Masuk</span>
            <span className={`ml-auto py-0.5 px-2 rounded-full text-xs transition-colors ${currentView === 'INCOMING' ? 'bg-brand-200 text-brand-800' : 'bg-gray-100 text-gray-600'}`}>
              {stats.incoming}
            </span>
          </button>
          <button
            onClick={() => setCurrentView('OUTGOING')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${currentView === 'OUTGOING' ? 'bg-brand-50 text-brand-600 font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Send size={20} />
            <span>Surat Keluar</span>
            <span className={`ml-auto py-0.5 px-2 rounded-full text-xs transition-colors ${currentView === 'OUTGOING' ? 'bg-brand-200 text-brand-800' : 'bg-gray-100 text-gray-600'}`}>
              {stats.outgoing}
            </span>
          </button>

          {/* Sidebar Input Menu - Available for ALL users now */}
          <div className="pt-2 mt-2 border-t border-gray-100">
              <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Input Data</p>
              <button
              onClick={() => handleOpenAdd(MailType.INCOMING)}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-brand-600 transition-all duration-200"
              >
                <Inbox size={20} />
                <span>Input Surat Masuk</span>
              </button>
              <button
              onClick={() => handleOpenAdd(MailType.OUTGOING)}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-brand-600 transition-all duration-200"
              >
                <Send size={20} />
                <span>Input Surat Keluar</span>
              </button>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 border border-brand-200">
              <UserIcon size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{user.name}</p>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">{user.position}</span>
                <span className="text-[10px] text-brand-600 font-bold tracking-wider">{user.role}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors bg-white"
          >
            <LogOut size={16} />
            <span>Keluar</span>
          </button>
          <div className="mt-4 text-center text-[10px] text-gray-300 font-medium">
             @ 2026 Dev Dedy Meyga Saputra, S.Pd, M.Pd
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto relative">
        {/* HEADER MOBILE & SEARCH */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="md:hidden flex items-center space-x-2">
            <div className="bg-brand-600 p-1.5 rounded-lg text-white">
               <Send size={20} />
            </div>
            <div>
              <span className="font-bold text-gray-800 block leading-none">ArsipPro</span>
              <span className="text-[9px] text-brand-600 font-bold uppercase">UPT SD Negeri Remen 2</span>
            </div>
          </div>
          
          <h1 className="hidden md:block text-2xl font-bold text-gray-800">
            {currentView === 'DASHBOARD' && 'Dasbor Eksekutif'}
            {currentView === 'INCOMING' && 'Arsip Surat Masuk'}
            {currentView === 'OUTGOING' && 'Arsip Surat Keluar'}
          </h1>

          <div className="flex items-center space-x-4">
             {currentView !== 'DASHBOARD' && (
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Cari perihal, no surat..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-full bg-gray-100 border border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 w-48 md:w-64 transition-all outline-none"
                />
              </div>
            )}
            
            {/* Add Button - Visible for ALL users when in specific list views */}
            {currentView !== 'DASHBOARD' && (
              <button 
                onClick={() => handleOpenAdd()}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg shadow-md shadow-brand-500/20 hover:shadow-lg transition-all flex items-center space-x-2"
              >
                <Plus size={18} />
                <span className="hidden sm:inline font-medium">Tambah Baru</span>
              </button>
            )}
          </div>
        </header>

        {/* LOADING INDICATOR */}
        {isLoadingData && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg border border-brand-100 flex items-center space-x-2 z-20">
            <Loader2 size={16} className="animate-spin text-brand-600" />
            <span className="text-xs font-medium text-gray-600">Sinkronisasi data...</span>
          </div>
        )}

        <div className="p-6">
          {/* DASHBOARD VIEW */}
          {currentView === 'DASHBOARD' && (
            <div className="space-y-6">
              
              {/* MENU INPUT ARSIP for ALL USERS */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
                  {/* Background Decor */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
                  
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center relative z-10">
                    <div className="bg-brand-100 p-1.5 rounded-lg mr-3 text-brand-600">
                      <Plus size={20} />
                    </div>
                    Menu Input Arsip
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                    <button 
                      onClick={() => handleOpenAdd(MailType.INCOMING)}
                      className="flex items-center p-4 bg-blue-50/50 border border-blue-100 rounded-xl hover:shadow-md hover:bg-blue-50 hover:border-blue-200 group transition-all"
                    >
                      <div className="bg-white text-blue-600 p-3 rounded-xl shadow-sm mr-4 group-hover:scale-110 transition-transform">
                        <Inbox size={24} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors">Input Surat Masuk</h3>
                        <p className="text-sm text-gray-500">Catat arsip surat yang diterima</p>
                      </div>
                      <div className="ml-auto bg-white p-2 rounded-full text-gray-300 group-hover:text-blue-600 shadow-sm">
                        <Plus size={20} />
                      </div>
                    </button>

                    <button 
                      onClick={() => handleOpenAdd(MailType.OUTGOING)}
                      className="flex items-center p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl hover:shadow-md hover:bg-indigo-50 hover:border-indigo-200 group transition-all"
                    >
                      <div className="bg-white text-indigo-600 p-3 rounded-xl shadow-sm mr-4 group-hover:scale-110 transition-transform">
                        <Send size={24} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">Input Surat Keluar</h3>
                        <p className="text-sm text-gray-500">Catat arsip surat yang dikirim</p>
                      </div>
                      <div className="ml-auto bg-white p-2 rounded-full text-gray-300 group-hover:text-indigo-600 shadow-sm">
                        <Plus size={20} />
                      </div>
                    </button>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  title="Total Masuk" 
                  value={stats.incoming} 
                  icon={<Inbox size={24} />} 
                  color="bg-blue-500" 
                />
                <StatCard 
                  title="Total Keluar" 
                  value={stats.outgoing} 
                  icon={<Send size={24} />} 
                  color="bg-indigo-500" 
                />
                <StatCard 
                  title="Aktivitas Terbaru" 
                  value={stats.recent} 
                  icon={<Clock size={24} />} 
                  color="bg-amber-500" 
                />
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <Clock size={20} className="mr-2 text-brand-500" />
                  Aktivitas Terbaru
                </h3>
                <div className="space-y-4">
                  {mails.slice(0, 5).map(mail => (
                    <div key={mail.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 transition-all cursor-pointer group gap-4" onClick={() => handleView(mail)}>
                      <div className="flex items-center space-x-4 w-full sm:w-auto">
                        <div className={`p-3 rounded-full shrink-0 transition-colors ${mail.type === MailType.INCOMING ? 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                          {mail.type === MailType.INCOMING ? <Inbox size={18} /> : <Send size={18} />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 group-hover:text-brand-600 transition-colors truncate">{mail.subject}</p>
                          <div className="flex flex-col text-sm text-gray-500 mt-1">
                             <span>{mail.referenceNumber} • {mail.date}</span>
                             <span className="text-xs font-medium text-gray-400 mt-0.5 truncate">
                                {mail.type === MailType.INCOMING ? 'Dari: ' : 'Kepada: '}{mail.recipient}
                             </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-3 pl-14 sm:pl-0">
                        {mail.archiveCode && (
                          <span className="px-2 py-1 rounded bg-gray-100 text-gray-500 text-xs font-mono">
                            {mail.archiveCode}
                          </span>
                        )}
                        <button className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm whitespace-nowrap">
                          Lihat Detail
                        </button>
                      </div>
                    </div>
                  ))}
                  {mails.length === 0 && <p className="text-gray-400 text-center py-4">{isLoadingData ? 'Memuat...' : 'Belum ada aktivitas.'}</p>}
                </div>
              </div>
            </div>
          )}

          {/* TABLE VIEW (INCOMING/OUTGOING) */}
          {(currentView === 'INCOMING' || currentView === 'OUTGOING') && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">No. Surat / Tanggal</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Perihal</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                         {currentView === 'INCOMING' ? 'Diterima Dari' : 'Dikirim Kepada'}
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kode Arsip</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredMails.map(mail => (
                      <tr key={mail.id} className="hover:bg-brand-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-800">{mail.referenceNumber}</p>
                          <p className="text-xs text-gray-500">{mail.date}</p>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="font-medium text-gray-800 truncate">{mail.subject}</p>
                          {mail.relatedTo && (
                             <p className="text-xs text-gray-400 mt-1 flex items-center">
                               <LinkIcon size={10} className="mr-1" />
                               Ref: {mail.relatedTo}
                             </p>
                          )}
                          {mail.fileLink && (
                            <a href={mail.fileLink} target="_blank" rel="noreferrer" className="inline-flex items-center mt-1 text-xs text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
                              <Paperclip size={10} className="mr-1" />
                              Lampiran
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-700">
                            {mail.recipient}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                           {mail.archiveCode ? (
                             <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                               {mail.archiveCode}
                             </span>
                           ) : (
                             <span className="text-xs text-gray-400">-</span>
                           )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => handleView(mail)} className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Lihat Detail">
                            <Eye size={18} />
                          </button>
                          
                          {/* Edit available for Everyone */}
                          <button onClick={() => handleEdit(mail)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                            <Edit size={18} />
                          </button>

                          {/* Delete Restricted to ADMIN */}
                          {user.role === Role.ADMIN && (
                              <button onClick={() => handleDelete(mail.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                                <Trash2 size={18} />
                              </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredMails.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                          <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                             <Inbox size={32} className="opacity-20" />
                          </div>
                          <p>{isLoadingData ? 'Sedang memuat data dari Spreadsheet...' : 'Tidak ada arsip ditemukan.'}</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: CREATE / EDIT (MENU INPUT LENGKAP) */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingMail ? 'Edit Data Arsip' : (formData.type === MailType.INCOMING ? 'Input Surat Masuk Baru' : 'Input Surat Keluar Baru')}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section: Jenis & Info Dasar */}
          <div className={`p-4 rounded-xl border ${formData.type === MailType.INCOMING ? 'bg-blue-50 border-blue-100' : 'bg-indigo-50 border-indigo-100'}`}>
             <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center ${formData.type === MailType.INCOMING ? 'text-blue-400' : 'text-indigo-400'}`}>
                <FileText size={14} className="mr-1" /> Informasi Dasar
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Arsip</label>
                  <div className="relative">
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none appearance-none transition-shadow bg-white"
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as MailType})}
                      >
                        <option value={MailType.INCOMING}>Surat Masuk</option>
                        <option value={MailType.OUTGOING}>Surat Keluar</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                      </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Surat</label>
                  <input 
                    required 
                    type="date" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-shadow"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Surat</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-shadow"
                    value={formData.referenceNumber}
                    onChange={e => setFormData({...formData, referenceNumber: e.target.value})}
                    placeholder="Contoh: 005/UND/XII/2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.type === MailType.INCOMING ? 'Diterima Dari (Pengirim)' : 'Dikirim Kepada (Tujuan)'}
                  </label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-shadow"
                    value={formData.recipient}
                    onChange={e => setFormData({...formData, recipient: e.target.value})}
                    placeholder={formData.type === MailType.INCOMING ? "Nama Instansi / Perorangan" : "Nama Bagian / Instansi Luar"}
                  />
                </div>
             </div>
          </div>

          {/* Section: Detail Isi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Perihal Surat</label>
            <textarea 
              required 
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-shadow"
              value={formData.subject}
              onChange={e => setFormData({...formData, subject: e.target.value})}
              placeholder="Ringkasan isi surat..."
            />
          </div>

          {/* Section: Metadata Arsip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kode Klasifikasi/Arsip</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Hash size={14} />
                </div>
                <input 
                  type="text" 
                  disabled
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-shadow bg-gray-100 text-gray-500 cursor-not-allowed"
                  value={formData.archiveCode}
                  onChange={e => setFormData({...formData, archiveCode: e.target.value})}
                  placeholder="Digenerate Otomatis oleh Sistem"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referensi Surat Lain</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <LinkIcon size={14} />
                </div>
                <input 
                  type="text" 
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-shadow"
                  value={formData.relatedTo}
                  onChange={e => setFormData({...formData, relatedTo: e.target.value})}
                  placeholder="Isi jika membalas surat lain..."
                />
              </div>
            </div>
          </div>

          {/* Section: File & Keterangan (BARU - DENGAN UPLOAD) */}
          <div className="border-t border-gray-100 pt-4">
             <div className="grid grid-cols-1 gap-4">
                
                {/* FILE UPLOAD INPUT */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload File Digital (Google Drive)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-brand-400 transition-colors bg-gray-50/50">
                    <div className="flex flex-col items-center justify-center space-y-2">
                       <div className="p-3 bg-brand-50 text-brand-500 rounded-full">
                         <UploadCloud size={24} />
                       </div>
                       <div className="text-center">
                         <label htmlFor="file-upload" className="cursor-pointer font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-500">
                           <span>Klik untuk upload</span>
                           <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                         </label>
                         <span className="text-gray-500 text-xs"> atau drag file kesini</span>
                       </div>
                       <p className="text-xs text-gray-400">PDF, JPG, PNG (Max 4MB)</p>
                    </div>
                    {selectedFile && (
                      <div className="mt-4 flex items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <FileText size={20} className="text-brand-500 mr-3" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button type="button" onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-red-500">
                          <XIconSmall />
                        </button>
                      </div>
                    )}
                    {fileError && <p className="text-xs text-red-500 mt-2 text-center font-medium">{fileError}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Atau Masukkan Link File (Manual)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <LinkIcon size={14} />
                    </div>
                    <input 
                      type="url" 
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-shadow text-sm"
                      value={formData.fileLink}
                      onChange={e => setFormData({...formData, fileLink: e.target.value})}
                      placeholder="https://..."
                      readOnly={!!selectedFile} // Readonly if file is selected
                    />
                  </div>
                  {selectedFile && <p className="text-xs text-brand-500 mt-1 italic">*Link akan terisi otomatis setelah file terupload.</p>}
                </div>
                
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan / Disposisi</label>
                   <div className="relative">
                      <div className="absolute top-3 left-3 pointer-events-none text-gray-400">
                        <AlignLeft size={14} />
                      </div>
                      <textarea 
                        rows={2}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-shadow"
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        placeholder="Catatan tambahan, lokasi fisik arsip, atau instruksi disposisi..."
                      />
                   </div>
                </div>
             </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isSaving}
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all flex items-center"
            >
              {isSaving && <Loader2 size={16} className="animate-spin mr-2" />}
              {isSaving ? (selectedFile ? 'Mengupload...' : 'Menyimpan...') : (editingMail ? 'Perbarui Data' : 'Simpan Arsip')}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: VIEW DETAILS */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Detail Arsip Surat"
      >
        {viewingMail && (
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div className="flex-1">
                <span className={`inline-block px-2 py-1 rounded-md text-xs font-bold mb-2 ${viewingMail.type === MailType.INCOMING ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                   {viewingMail.type === MailType.INCOMING ? 'SURAT MASUK' : 'SURAT KELUAR'}
                </span>
                <h3 className="text-xl font-bold text-gray-900 leading-tight">{viewingMail.subject}</h3>
                <span className="text-sm text-gray-500 font-mono flex items-center mt-2">
                   <FileText size={14} className="mr-1" />
                   {viewingMail.referenceNumber}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
               <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="block text-gray-400 text-xs uppercase mb-1">Tanggal Surat</span>
                <span className="font-semibold text-gray-800">{viewingMail.date}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="block text-gray-400 text-xs uppercase mb-1">
                  {viewingMail.type === MailType.INCOMING ? 'Diterima Dari' : 'Dikirim Kepada'}
                </span>
                <span className="font-semibold text-gray-800">{viewingMail.recipient}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="block text-gray-400 text-xs uppercase mb-1">Kode Arsip</span>
                <span className="font-semibold text-gray-800 font-mono">{viewingMail.archiveCode || '-'}</span>
              </div>
               <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="block text-gray-400 text-xs uppercase mb-1">Hubungan Surat</span>
                <span className="font-semibold text-gray-800">{viewingMail.relatedTo || '-'}</span>
              </div>
            </div>

            {/* Description & File Link */}
            {(viewingMail.description || viewingMail.fileLink) && (
              <div className="bg-brand-50/50 p-4 rounded-xl border border-brand-100 space-y-3">
                 {viewingMail.description && (
                   <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Keterangan / Disposisi</h4>
                      <p className="text-gray-800 text-sm whitespace-pre-wrap">{viewingMail.description}</p>
                   </div>
                 )}
                 {viewingMail.fileLink && (
                   <div className="pt-2">
                     <a 
                       href={viewingMail.fileLink} 
                       target="_blank" 
                       rel="noreferrer"
                       className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-blue-600 text-sm font-medium hover:bg-blue-50 hover:border-blue-200 transition-colors shadow-sm"
                     >
                       <Paperclip size={16} className="mr-2" />
                       Buka Dokumen Lampiran
                       <ExternalLink size={14} className="ml-2 opacity-50" />
                     </a>
                   </div>
                 )}
              </div>
            )}

            <div>
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2 flex items-center">
                <FileText size={16} className="mr-2 text-gray-400" />
                Perihal Lengkap
              </h4>
              <div className="bg-gray-50 p-4 rounded-xl text-gray-700 text-sm leading-relaxed whitespace-pre-wrap border border-gray-100">
                {viewingMail.subject}
              </div>
            </div>
            
            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// Small icon component helper
const XIconSmall = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
)

export default App;
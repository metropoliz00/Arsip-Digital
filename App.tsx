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
  UploadCloud,
  AlertTriangle,
  HardDrive,
  Globe,
  X,
  Copy,
  Menu, // Icon baru untuk menu mobile
  ChevronRight,
  Calendar // Icon Calendar
} from 'lucide-react';
import { Role, Mail, MailType, User } from './types';
import { sheetApi } from './services/sheetApi'; // Import API Service
import { StatCard } from './components/StatCard';
import { Modal } from './components/Modal';
import { DatePicker } from './components/DatePicker';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State untuk Mobile Sidebar
  
  // State: Drive Integration
  const [hasOpenedDrive, setHasOpenedDrive] = useState(false);

  const [editingMail, setEditingMail] = useState<Mail | null>(null);
  const [viewingMail, setViewingMail] = useState<Mail | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  // Date Display Helper
  const todayDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
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
    setIsSidebarOpen(false);
  };

  // --- HANDLERS: UI ---
  const handleNavClick = (view: 'DASHBOARD' | 'INCOMING' | 'OUTGOING') => {
    setCurrentView(view);
    setIsSidebarOpen(false); // Close sidebar on mobile when item clicked
  };

  // --- HANDLERS: CRUD ---
  const handleOpenAdd = (targetType?: MailType) => {
    setEditingMail(null);
    setHasOpenedDrive(false); 
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
    setIsSidebarOpen(false);
  };

  const handleEdit = (mail: Mail) => {
    setEditingMail(mail);
    setHasOpenedDrive(!!mail.fileLink);
    setFormData({ ...mail });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus arsip ini?')) {
      const prevMails = [...mails];
      setMails(prev => prev.filter(m => m.id !== id));
      
      const success = await sheetApi.deleteMail(id);
      if (!success) {
        alert("Gagal menghapus dari database.");
        setMails(prevMails); 
      }
    }
  };

  const handleView = (mail: Mail) => {
    setViewingMail(mail);
    setIsViewModalOpen(true);
  };

  const handleOpenDrive = () => {
    window.open('https://drive.google.com/drive/folders/1tcMmAVdb14bjGO5bNKUpeSs4TDrz3Fnf', '_blank');
    setHasOpenedDrive(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    let mailToSave: Mail;

    if (editingMail) {
      mailToSave = { ...formData, id: editingMail.id } as Mail;
    } else {
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Date.now().toString() + Math.random().toString(36).substring(2);

      mailToSave = { ...formData, id: newId } as Mail;
    }

    const result: any = await sheetApi.saveMail(mailToSave);

    if (result.success) {
      if (result.archiveCode) {
        mailToSave.archiveCode = result.archiveCode;
      }
      if (result.message && result.message !== "Data tersimpan.") {
        alert(result.message);
      }
      if (editingMail) {
        setMails(prev => prev.map(m => m.id === mailToSave.id ? mailToSave : m));
      } else {
        setMails(prev => [mailToSave, ...prev]);
      }
      setIsModalOpen(false);
    } else {
      alert("Gagal menyimpan. " + (result.message || "Pastikan script URL benar."));
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
      <div className="min-h-screen flex items-center justify-center bg-blue-50 relative overflow-hidden px-4">
        {/* Modern Background Motif */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-72 h-72 md:w-96 md:h-96 bg-brand-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
          <div className="absolute top-[-10%] right-[-10%] w-72 h-72 md:w-96 md:h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-20 w-72 h-72 md:w-96 md:h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/50 relative z-10 transition-all hover:shadow-brand-500/10">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-tr from-brand-500 to-brand-600 p-4 md:p-5 rounded-2xl shadow-lg shadow-brand-500/30 mb-5 transform -rotate-3 transition-transform hover:rotate-0 duration-300 group">
              <Send className="w-8 h-8 md:w-10 md:h-10 text-white transform group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight text-center">Arsip Digital</h2>
            <p className="text-gray-500 font-medium text-xs md:text-sm mt-2 text-center">Smart Digital Archives Management</p>
            <p className="text-brand-600 font-bold text-[10px] md:text-xs mt-1 uppercase tracking-wide text-center">UPT SD Negeri Remen 2</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5 md:space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide ml-1">Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                </div>
                <input
                  type="text"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:bg-white outline-none transition-all duration-200 text-sm md:text-base"
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
                  className="w-full pl-12 pr-12 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:bg-white outline-none transition-all duration-200 text-sm md:text-base"
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
        
        <div className="absolute bottom-6 text-center w-full text-brand-900/40 text-[10px] font-medium px-4">
          © 2026 Dev Dedy Meyga Saputra, S.Pd, M.Pd
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR (Responsive) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col shadow-2xl md:shadow-none transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="bg-brand-600 p-2 rounded-lg text-white shadow-lg shadow-brand-500/30">
              <Send size={24} className="transform -rotate-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight leading-none">Arsip Digital</h1>
              <p className="text-[10px] font-bold text-brand-600 mt-1 uppercase tracking-wide">UPT SD Negeri Remen 2</p>
            </div>
          </div>
          {/* Close Button Mobile */}
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-red-500">
             <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => handleNavClick('DASHBOARD')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 ${currentView === 'DASHBOARD' ? 'bg-brand-50 text-brand-600 font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <LayoutDashboard size={20} />
            <span>Dasbor</span>
          </button>
          <button
            onClick={() => handleNavClick('INCOMING')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 ${currentView === 'INCOMING' ? 'bg-brand-50 text-brand-600 font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Inbox size={20} />
            <span>Surat Masuk</span>
            <span className={`ml-auto py-0.5 px-2 rounded-full text-xs transition-colors ${currentView === 'INCOMING' ? 'bg-brand-200 text-brand-800' : 'bg-gray-100 text-gray-600'}`}>
              {stats.incoming}
            </span>
          </button>
          <button
            onClick={() => handleNavClick('OUTGOING')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 ${currentView === 'OUTGOING' ? 'bg-brand-50 text-brand-600 font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Send size={20} />
            <span>Surat Keluar</span>
            <span className={`ml-auto py-0.5 px-2 rounded-full text-xs transition-colors ${currentView === 'OUTGOING' ? 'bg-brand-200 text-brand-800' : 'bg-gray-100 text-gray-600'}`}>
              {stats.outgoing}
            </span>
          </button>

          {/* Sidebar Input Menu - Available ONLY for ADMIN */}
          {user.role === Role.ADMIN && (
            <div className="pt-2 mt-2 border-t border-gray-100">
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Input Data</p>
                <button
                onClick={() => handleOpenAdd(MailType.INCOMING)}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-brand-600 transition-all duration-200 active:scale-95"
                >
                  <Inbox size={20} />
                  <span>Input Surat Masuk</span>
                </button>
                <button
                onClick={() => handleOpenAdd(MailType.OUTGOING)}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-brand-600 transition-all duration-200 active:scale-95"
                >
                  <Send size={20} />
                  <span>Input Surat Keluar</span>
                </button>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 border border-brand-200 shrink-0">
              <UserIcon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 truncate">{user.position}</span>
                <span className="text-[10px] text-brand-600 font-bold tracking-wider">{user.role}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors bg-white active:scale-95"
          >
            <LogOut size={16} />
            <span>Keluar</span>
          </button>
          <div className="mt-4 text-center px-2">
             <p className="text-[8px] text-brand-900/40 font-medium leading-tight">
               © 2026 Dev Dedy Meyga Saputra, S.Pd, M.Pd
             </p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto relative w-full">
        
        {/* HEADER MOBILE & SEARCH */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 md:px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3 md:hidden">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg active:scale-95 transition-transform"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center space-x-2">
                <div className="bg-brand-600 p-1.5 rounded-lg text-white">
                  <Send size={18} />
                </div>
                <span className="font-bold text-gray-800 text-lg leading-none">ArsipPro</span>
            </div>
          </div>
          
          <h1 className="hidden md:block text-2xl font-bold text-gray-800">
            {currentView === 'DASHBOARD' && 'Dasbor Eksekutif'}
            {currentView === 'INCOMING' && 'Arsip Surat Masuk'}
            {currentView === 'OUTGOING' && 'Arsip Surat Keluar'}
          </h1>

          <div className="flex items-center space-x-3 md:space-x-4">
            
            {/* TANGGAL HARI INI (Desktop Only) */}
            <div className="hidden lg:flex items-center mr-2 md:mr-4 text-right border-r border-gray-100 pr-4">
              <div className="mr-3 bg-brand-50 p-2 rounded-lg text-brand-500">
                <Calendar size={20} />
              </div>
              <div>
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Hari Ini</p>
                 <p className="text-sm font-bold text-gray-800 leading-none">{todayDate}</p>
              </div>
            </div>

             {currentView !== 'DASHBOARD' && (
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Cari..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-full bg-gray-100 border border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 w-32 md:w-64 transition-all outline-none text-sm"
                />
              </div>
            )}
            
            {/* Add Button - Visible ONLY for ADMIN */}
            {currentView !== 'DASHBOARD' && user.role === Role.ADMIN && (
              <button 
                onClick={() => handleOpenAdd()}
                className="bg-brand-600 hover:bg-brand-700 text-white px-3 md:px-4 py-2 rounded-lg shadow-md shadow-brand-500/20 hover:shadow-lg transition-all flex items-center space-x-2 active:scale-95"
              >
                <Plus size={18} />
                <span className="hidden sm:inline font-medium">Baru</span>
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

        <div className="p-4 md:p-6 pb-20 md:pb-6">
          {/* DASHBOARD VIEW */}
          {currentView === 'DASHBOARD' && (
            <div className="space-y-6">
              
              {/* MENU INPUT ARSIP for ADMIN ONLY */}
              {user.role === Role.ADMIN && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 relative overflow-hidden">
                    {/* Background Decor */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
                    
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center relative z-10">
                      <div className="bg-brand-100 p-1.5 rounded-lg mr-3 text-brand-600">
                        <Plus size={20} />
                      </div>
                      Input Data Cepat
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                      <button 
                        onClick={() => handleOpenAdd(MailType.INCOMING)}
                        className="flex items-center p-4 bg-blue-50/50 border border-blue-100 rounded-xl hover:shadow-md hover:bg-blue-50 hover:border-blue-200 group transition-all active:scale-[0.98]"
                      >
                        <div className="bg-white text-blue-600 p-3 rounded-xl shadow-sm mr-4 group-hover:scale-110 transition-transform">
                          <Inbox size={24} />
                        </div>
                        <div className="text-left flex-1">
                          <h3 className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors">Surat Masuk</h3>
                          <p className="text-xs md:text-sm text-gray-500">Catat surat diterima</p>
                        </div>
                        <ChevronRight className="text-blue-300 group-hover:text-blue-600" />
                      </button>

                      <button 
                        onClick={() => handleOpenAdd(MailType.OUTGOING)}
                        className="flex items-center p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl hover:shadow-md hover:bg-indigo-50 hover:border-indigo-200 group transition-all active:scale-[0.98]"
                      >
                        <div className="bg-white text-indigo-600 p-3 rounded-xl shadow-sm mr-4 group-hover:scale-110 transition-transform">
                          <Send size={24} />
                        </div>
                        <div className="text-left flex-1">
                          <h3 className="font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">Surat Keluar</h3>
                          <p className="text-xs md:text-sm text-gray-500">Catat surat dikirim</p>
                        </div>
                        <ChevronRight className="text-indigo-300 group-hover:text-indigo-600" />
                      </button>
                    </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <Clock size={20} className="mr-2 text-brand-500" />
                  Aktivitas Terbaru
                </h3>
                <div className="space-y-4">
                  {mails.slice(0, 5).map(mail => (
                    <div key={mail.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 transition-all cursor-pointer group gap-3 active:scale-[0.99]" onClick={() => handleView(mail)}>
                      <div className="flex items-center space-x-3 md:space-x-4 w-full sm:w-auto">
                        <div className={`p-2.5 md:p-3 rounded-full shrink-0 transition-colors ${mail.type === MailType.INCOMING ? 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                          {mail.type === MailType.INCOMING ? <Inbox size={18} /> : <Send size={18} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-800 group-hover:text-brand-600 transition-colors truncate text-sm md:text-base">{mail.subject}</p>
                          <div className="flex flex-col text-xs text-gray-500 mt-0.5">
                             <span>{mail.referenceNumber} • {mail.date}</span>
                             <span className="font-medium text-gray-400 mt-0.5 truncate">
                                {mail.type === MailType.INCOMING ? 'Dari: ' : 'Kepada: '}{mail.recipient}
                             </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto pl-0 sm:pl-4 mt-1 sm:mt-0">
                        {mail.archiveCode && (
                          <span className="px-2 py-1 rounded bg-gray-100 text-gray-500 text-[10px] font-mono mr-2 hidden sm:inline-block">
                            {mail.archiveCode}
                          </span>
                        )}
                        <span className="text-xs text-brand-600 font-medium sm:hidden">Lihat Detail</span>
                      </div>
                    </div>
                  ))}
                  {mails.length === 0 && <p className="text-gray-400 text-center py-4 text-sm">{isLoadingData ? 'Memuat...' : 'Belum ada aktivitas.'}</p>}
                </div>
              </div>
            </div>
          )}

          {/* TABLE VIEW (INCOMING/OUTGOING) */}
          {(currentView === 'INCOMING' || currentView === 'OUTGOING') && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">No. Surat / Tanggal</th>
                      <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider min-w-[200px]">Perihal</th>
                      <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider min-w-[120px]">
                         {currentView === 'INCOMING' ? 'Dari' : 'Kepada'}
                      </th>
                      <th className="px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">Kode Arsip</th>
                      <th className="px-3 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredMails.map(mail => (
                      <tr key={mail.id} className="hover:bg-brand-50/30 transition-colors group">
                        <td className="px-3 py-3 whitespace-nowrap">
                          <p className="text-xs font-semibold text-gray-800">{mail.referenceNumber}</p>
                          <p className="text-[10px] text-gray-500">{mail.date}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-xs text-gray-800 leading-snug line-clamp-2">{mail.subject}</p>
                          {mail.relatedTo && (
                             <p className="text-[10px] text-gray-400 mt-1 flex items-center">
                               <LinkIcon size={8} className="mr-1" />
                               Ref: {mail.relatedTo}
                             </p>
                          )}
                          {mail.fileLink && (
                            <a href={mail.fileLink} target="_blank" rel="noreferrer" className="inline-flex items-center mt-1 text-[10px] text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
                              <Paperclip size={10} className="mr-1" />
                              Lampiran
                            </a>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-xs text-gray-700 leading-snug truncate max-w-[120px]">
                            {mail.recipient}
                          </p>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap hidden md:table-cell">
                           {mail.archiveCode ? (
                             <span className="font-mono text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-600">
                               {mail.archiveCode}
                             </span>
                           ) : (
                             <span className="text-[10px] text-gray-400">-</span>
                           )}
                        </td>
                        <td className="px-3 py-3 text-right space-x-1 whitespace-nowrap">
                          <button onClick={() => handleView(mail)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors active:scale-90" title="Lihat Detail">
                            <Eye size={16} />
                          </button>
                          
                          {/* EDIT Button Restricted to ADMIN */}
                          {user.role === Role.ADMIN && (
                            <button onClick={() => handleEdit(mail)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors active:scale-90" title="Edit">
                                <Edit size={16} />
                            </button>
                          )}

                          {/* DELETE Button Restricted to ADMIN */}
                          {user.role === Role.ADMIN && (
                              <button onClick={() => handleDelete(mail.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors active:scale-90" title="Hapus">
                                <Trash2 size={16} />
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
                          <p className="text-sm">{isLoadingData ? 'Sedang memuat data dari Spreadsheet...' : 'Tidak ada arsip ditemukan.'}</p>
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

      {/* MODAL: CREATE / EDIT */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingMail ? 'Edit Data Arsip' : (formData.type === MailType.INCOMING ? 'Input Surat Masuk' : 'Input Surat Keluar')}
      >
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          
          <div className={`p-4 rounded-xl border ${formData.type === MailType.INCOMING ? 'bg-blue-50 border-blue-100' : 'bg-indigo-50 border-indigo-100'}`}>
             <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center ${formData.type === MailType.INCOMING ? 'text-blue-400' : 'text-indigo-400'}`}>
                <FileText size={14} className="mr-1" /> Informasi Dasar
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Arsip</label>
                  <div className="relative">
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none appearance-none transition-shadow bg-white text-sm"
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as MailType})}
                      >
                        <option value={MailType.INCOMING}>Surat Masuk</option>
                        <option value={MailType.OUTGOING}>Surat Keluar</option>
                      </select>
                  </div>
                </div>
                <div>
                  <DatePicker 
                    label="Tanggal Surat"
                    value={formData.date || ''}
                    onChange={(newDate) => setFormData({...formData, date: newDate})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Surat</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-shadow text-sm"
                    value={formData.referenceNumber}
                    onChange={e => setFormData({...formData, referenceNumber: e.target.value})}
                    placeholder="Contoh: 005/UND/XII/2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.type === MailType.INCOMING ? 'Diterima Dari' : 'Dikirim Kepada'}
                  </label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-shadow text-sm"
                    value={formData.recipient}
                    onChange={e => setFormData({...formData, recipient: e.target.value})}
                    placeholder={formData.type === MailType.INCOMING ? "Nama Instansi / Perorangan" : "Nama Bagian / Instansi Luar"}
                  />
                </div>
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Perihal Surat</label>
            <textarea 
              required 
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-shadow text-sm"
              value={formData.subject}
              onChange={e => setFormData({...formData, subject: e.target.value})}
              placeholder="Ringkasan isi surat..."
            />
          </div>

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
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-shadow bg-gray-100 text-gray-500 cursor-not-allowed text-sm"
                  value={formData.archiveCode}
                  onChange={e => setFormData({...formData, archiveCode: e.target.value})}
                  placeholder="Otomatis"
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
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-shadow text-sm"
                  value={formData.relatedTo}
                  onChange={e => setFormData({...formData, relatedTo: e.target.value})}
                  placeholder="Isi jika membalas surat..."
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
             <div className="grid grid-cols-1 gap-4">
                <div className="p-3 md:p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dokumen Digital</label>
                  
                  <div className="flex flex-col gap-3">
                    <button 
                      type="button" 
                      onClick={handleOpenDrive}
                      className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-300 hover:border-brand-500 hover:text-brand-600 text-gray-700 px-4 py-3 rounded-xl transition-all shadow-sm hover:shadow-md group active:scale-95"
                    >
                      <div className="bg-green-50 text-green-600 p-1.5 rounded-lg group-hover:bg-green-100 transition-colors">
                         <HardDrive size={20} />
                      </div>
                      <div className="text-left flex-1 ml-2">
                        <span className="font-bold block text-sm">Buka Google Drive</span>
                        <span className="text-[10px] text-gray-500 font-normal">Upload & Salin Link</span>
                      </div>
                      <ExternalLink size={16} className="text-gray-400" />
                    </button>
                  </div>
                </div>

                {(hasOpenedDrive || formData.fileLink) && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-500 bg-brand-50/50 p-4 rounded-xl border border-brand-100">
                    <label className="block text-sm font-bold text-brand-700 mb-2 flex items-center">
                       <LinkIcon size={16} className="mr-2" />
                       Paste Link Disini
                    </label>
                    <div className="relative shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-400">
                        <Globe size={16} />
                      </div>
                      <input 
                        type="url" 
                        required
                        className="w-full pl-10 pr-3 py-3 border-2 border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow text-sm bg-white text-gray-800 placeholder-gray-400"
                        value={formData.fileLink}
                        onChange={e => setFormData({...formData, fileLink: e.target.value})}
                        placeholder="https://drive.google.com/..."
                      />
                    </div>
                  </div>
                )}
                
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan / Disposisi</label>
                   <textarea 
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-shadow text-sm"
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Catatan tambahan..."
                    />
                </div>
             </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3 sticky bottom-0 bg-white pb-2">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors active:scale-95 text-sm"
              disabled={isSaving}
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all flex items-center active:scale-95 text-sm"
            >
              {isSaving && <Loader2 size={16} className="animate-spin mr-2" />}
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: VIEW DETAILS */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Detail Arsip"
      >
        {viewingMail && (
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div className="flex-1">
                <span className={`inline-block px-2 py-1 rounded-md text-[10px] md:text-xs font-bold mb-2 ${viewingMail.type === MailType.INCOMING ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                   {viewingMail.type === MailType.INCOMING ? 'SURAT MASUK' : 'SURAT KELUAR'}
                </span>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">{viewingMail.subject}</h3>
                <span className="text-xs md:text-sm text-gray-500 font-mono flex items-center mt-2">
                   <FileText size={14} className="mr-1" />
                   {viewingMail.referenceNumber}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-sm">
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

            {viewingMail.fileLink && (
               <div className="bg-green-50 border border-green-200 rounded-xl p-3 md:p-4 flex flex-col md:flex-row items-center justify-between shadow-sm gap-3">
                  <div className="flex items-center space-x-3 w-full md:w-auto">
                     <div className="bg-green-100 p-2 rounded-lg text-green-600">
                        <Paperclip size={20} />
                     </div>
                     <div className="min-w-0">
                        <h4 className="text-sm font-bold text-gray-800">Lampiran</h4>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{viewingMail.fileLink}</p>
                     </div>
                  </div>
                  <a 
                     href={viewingMail.fileLink} 
                     target="_blank" 
                     rel="noreferrer"
                     className="w-full md:w-auto px-4 py-2 bg-white text-green-700 border border-green-200 text-sm font-semibold rounded-lg hover:bg-green-600 hover:text-white hover:border-transparent transition-all shadow-sm flex items-center justify-center active:scale-95"
                  >
                     <ExternalLink size={16} className="mr-2" />
                     Buka File
                  </a>
               </div>
            )}

            {viewingMail.description && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                 <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center">
                       <AlignLeft size={14} className="mr-1"/> Keterangan / Disposisi
                    </h4>
                    <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">{viewingMail.description}</p>
                 </div>
              </div>
            )}
            
            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="w-full md:w-auto px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors active:scale-95"
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
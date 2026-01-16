import React, { useState, useEffect, useMemo } from 'react';
import { 
  Inbox, 
  Send, 
  Search, 
  Plus, 
  LogOut, 
  LogIn,
  User as UserIcon, 
  LayoutDashboard, 
  Trash2, 
  Edit, 
  Eye, 
  EyeOff,
  Lock, 
  Clock, 
  Loader2, 
  Calendar, 
  Paperclip, 
  AlignLeft, 
  ExternalLink, 
  HardDrive, 
  Globe, 
  X, 
  Menu, 
  ChevronRight, 
  Filter, 
  MoreVertical 
} from 'lucide-react';
import { Role, Mail, MailType, User } from './types';
import { sheetApi } from './services/sheetApi';
import { StatCard } from './components/StatCard';
import { Modal } from './components/Modal';
import { DatePicker } from './components/DatePicker';

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

  // State: UI
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'INCOMING' | 'OUTGOING'>('DASHBOARD');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [editingMail, setEditingMail] = useState<Mail | null>(null);
  const [viewingMail, setViewingMail] = useState<Mail | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasOpenedDrive, setHasOpenedDrive] = useState(false);

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

  // Current Date Display
  const todayDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  useEffect(() => {
    if (user) loadMails();
  }, [user]);

  const loadMails = async () => {
    setIsLoadingData(true);
    const data = await sheetApi.getMails();
    setMails(data);
    setIsLoadingData(false);
  };

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
    setIsSidebarOpen(false);
  };

  const handleNavClick = (view: 'DASHBOARD' | 'INCOMING' | 'OUTGOING') => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  };

  const handleOpenAdd = (targetType?: MailType) => {
    if (user?.role !== Role.ADMIN) return;
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
    if (user?.role !== Role.ADMIN) return;
    setEditingMail(mail);
    setHasOpenedDrive(!!mail.fileLink);
    setFormData({ ...mail });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (user?.role !== Role.ADMIN) return;
    if (window.confirm('Hapus arsip ini?')) {
      const success = await sheetApi.deleteMail(id);
      if (success) setMails(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleOpenDrive = () => {
    window.open('https://drive.google.com/drive/folders/1tcMmAVdb14bjGO5bNKUpeSs4TDrz3Fnf', '_blank');
    setHasOpenedDrive(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const mailToSave = { ...formData, id: editingMail?.id || Date.now().toString() } as Mail;
    const result = await sheetApi.saveMail(mailToSave);
    if (result.success) {
      loadMails();
      setIsModalOpen(false);
    }
    setIsSaving(false);
  };

  const filteredMails = useMemo(() => {
    let result = mails;
    if (currentView === 'INCOMING') result = result.filter(m => m.type === MailType.INCOMING);
    if (currentView === 'OUTGOING') result = result.filter(m => m.type === MailType.OUTGOING);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(m => 
        m.subject.toLowerCase().includes(lower) || 
        m.referenceNumber.toLowerCase().includes(lower) ||
        m.recipient.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [mails, currentView, searchTerm]);

  const stats = useMemo(() => ({
    incoming: mails.filter(m => m.type === MailType.INCOMING).length,
    outgoing: mails.filter(m => m.type === MailType.OUTGOING).length,
    recent: mails.slice(0, 5).length
  }), [mails]);

  // LOGIN PAGE
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden px-6 font-sans">
        {/* Background blobs */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-400/30 rounded-full blur-[100px] animate-blob"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-400/30 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] shadow-2xl w-full max-w-[420px] border border-white z-10 transition-all hover:scale-[1.01] duration-500">
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="animate-float">
              <div className="bg-gradient-to-br from-brand-500 to-indigo-600 p-5 rounded-[1.5rem] shadow-lg shadow-brand-500/30 mb-6 transform -rotate-6 hover:rotate-0 transition-transform duration-300 cursor-pointer">
                <Send className="w-10 h-10 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Arsip Digital</h2>
            <p className="text-brand-600 font-bold text-xs mt-2 uppercase tracking-widest bg-brand-50 px-3 py-1 rounded-full">UPT SD Negeri Remen 2</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">Username</label>
              <div className="relative group">
                <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                <input
                  type="text"
                  required
                  className="w-full pl-14 pr-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-500 outline-none transition-all text-sm font-medium text-gray-700"
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  placeholder="Masukkan username"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">Password</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full pl-14 pr-14 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-500 outline-none transition-all text-sm font-medium text-gray-700"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-600 p-1">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {loginError && <div className="text-red-500 text-xs text-center font-bold bg-red-50 p-3 rounded-xl border border-red-100 flex items-center justify-center gap-2 animate-pulse"><X size={14}/> {loginError}</div>}
            
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-2xl shadow-xl shadow-gray-900/20 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center space-x-2 mt-4"
            >
              {isLoggingIn ? <Loader2 size={20} className="animate-spin" /> : <><LogIn size={20} /><span>Masuk Dashboard</span></>}
            </button>
          </form>
        </div>
        
        {/* FOOTER LOGIN - Mixed Case Allowed */}
        <div className="absolute bottom-6 text-center w-full z-10 px-4">
           <p className="text-[11px] font-bold text-gray-400/80 tracking-wide font-sans">
              @ 2026 | Dev. Dedy Meyga Saputra, S.Pd, M.Pd
           </p>
        </div>
      </div>
    );
  }

  // MAIN LAYOUT
  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] font-sans selection:bg-brand-100 selection:text-brand-900">
      
      {/* MOBILE DRAWER OVERLAY */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* SIDEBAR NAVIGATION */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[280px] bg-white flex flex-col shadow-2xl md:shadow-none border-r border-gray-100
        transform transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 pb-4 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="bg-brand-600 p-2.5 rounded-xl text-white shadow-brand-500/30 shadow-lg">
              <Send size={22} className="-rotate-12" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">Arsip Digital</h1>
              <p className="text-[10px] font-bold text-brand-600 mt-1 uppercase tracking-wider">UPT SD Negeri Remen 2</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-gray-400 hover:bg-gray-50 rounded-full">
             <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          <div className="mb-6 px-4">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Menu Utama</p>
             <button onClick={() => handleNavClick('DASHBOARD')} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all active:scale-95 duration-200 ${currentView === 'DASHBOARD' ? 'bg-brand-50 text-brand-700 font-bold shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium'}`}>
                <LayoutDashboard size={20} /><span>Dasbor</span>
             </button>
             <button onClick={() => handleNavClick('INCOMING')} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all active:scale-95 duration-200 ${currentView === 'INCOMING' ? 'bg-brand-50 text-brand-700 font-bold shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium'}`}>
                <Inbox size={20} /><span>Surat Masuk</span>
             </button>
             <button onClick={() => handleNavClick('OUTGOING')} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all active:scale-95 duration-200 ${currentView === 'OUTGOING' ? 'bg-brand-50 text-brand-700 font-bold shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium'}`}>
                <Send size={20} /><span>Surat Keluar</span>
             </button>
          </div>
          
          {user.role === Role.ADMIN && (
            <div className="px-4">
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Input Data</p>
               <button onClick={() => handleOpenAdd(MailType.INCOMING)} className="w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95 font-medium mb-1 group">
                  <div className="bg-gray-100 group-hover:bg-blue-100 p-1.5 rounded-lg transition-colors"><Plus size={14} /></div>
                  <span>Input Masuk</span>
               </button>
               <button onClick={() => handleOpenAdd(MailType.OUTGOING)} className="w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95 font-medium group">
                  <div className="bg-gray-100 group-hover:bg-indigo-100 p-1.5 rounded-lg transition-colors"><Plus size={14} /></div>
                  <span>Input Keluar</span>
               </button>
            </div>
          )}
        </nav>

        <div className="p-5 border-t border-gray-100 mx-4 mb-4">
          <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-brand-600 border border-gray-100 shrink-0">
               <UserIcon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
              <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wide">{user.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-600 py-3 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all font-bold text-sm shadow-sm active:scale-95">
             <LogOut size={16} /><span>Keluar</span>
          </button>
          
          {/* FOOTER SIDEBAR - Mixed Case Allowed */}
          <div className="mt-5 text-center">
             <p className="text-[8px] font-bold text-gray-300 tracking-wide font-sans">
                @ 2026 | Dev. Dedy Meyga Saputra, S.Pd, M.Pd
             </p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        
        {/* TOP HEADER */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-200/60 px-5 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-all relative">
          <div className="flex items-center space-x-4 flex-none">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl active:scale-95 shadow-sm">
               <Menu size={20} />
            </button>
            <h2 className="text-lg md:text-xl font-bold text-gray-800 truncate">
               <span className="md:hidden">{currentView === 'DASHBOARD' ? 'Dasbor' : currentView === 'INCOMING' ? 'Masuk' : 'Keluar'}</span>
               <span className="hidden md:inline">{currentView === 'DASHBOARD' ? 'Dasbor Eksekutif' : currentView === 'INCOMING' ? 'Arsip Surat Masuk' : 'Arsip Surat Keluar'}</span>
            </h2>
          </div>

          {/* CENTER: Date Display (Hidden on Mobile) */}
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center space-x-3 bg-white/50 px-4 py-2 rounded-full border border-gray-100 backdrop-blur-sm shadow-sm">
             <div className="bg-brand-50 p-1.5 rounded-full text-brand-600">
               <Calendar size={16} />
             </div>
             <p className="text-xs font-bold text-gray-600">
               <span className="text-gray-400 uppercase tracking-wider mr-2 text-[10px]">Hari Ini</span>
               {todayDate}
             </p>
          </div>

          <div className="flex items-center justify-end space-x-4 flex-none md:w-64">
            {/* Smart Search Bar */}
            {currentView !== 'DASHBOARD' && (
              <div className="relative w-full max-w-[140px] md:max-w-xs group transition-all duration-300">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" size={16} />
                <input 
                    type="text" 
                    placeholder="Cari..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full pl-9 md:pl-10 pr-4 py-2.5 bg-gray-100 border-none focus:bg-white focus:ring-2 focus:ring-brand-500/20 rounded-xl outline-none text-sm transition-all font-medium" 
                />
              </div>
            )}
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 custom-scrollbar">
          
          {/* Loading Indicator */}
          {isLoadingData && (
             <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center space-x-3 z-50 animate-in fade-in zoom-in-95 duration-300">
                <Loader2 size={16} className="animate-spin text-brand-400" />
                <span className="text-xs font-bold tracking-wide">SINKRON DATA...</span>
             </div>
          )}

          {currentView === 'DASHBOARD' ? (
            <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                <StatCard title="Total Masuk" value={stats.incoming} icon={<Inbox size={24} />} color="bg-brand-500" />
                <StatCard title="Total Keluar" value={stats.outgoing} icon={<Send size={24} />} color="bg-indigo-500" />
                <StatCard title="Terkini" value={stats.recent} icon={<Clock size={24} />} color="bg-amber-500" />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
                {/* Recent Activity List */}
                <div className="xl:col-span-2 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center"><Clock size={20} className="mr-3 text-brand-600" />Arsip Terbaru</h3>
                    {user.role === Role.ADMIN && <button onClick={() => handleOpenAdd()} className="text-xs font-bold bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full hover:bg-brand-100 transition-colors">Tambah Baru</button>}
                  </div>
                  <div className="space-y-3">
                    {mails.slice(0, 5).map(mail => (
                      <div key={mail.id} onClick={() => { setViewingMail(mail); setIsViewModalOpen(true); }} className="p-4 bg-gray-50/50 rounded-2xl hover:bg-white hover:shadow-lg border border-transparent hover:border-gray-100 group flex items-center cursor-pointer active:scale-[0.98] transition-all duration-200">
                        <div className={`p-3 rounded-xl mr-4 group-hover:scale-110 transition-transform ${mail.type === MailType.INCOMING ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                          {mail.type === MailType.INCOMING ? <Inbox size={20} /> : <Send size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 truncate text-sm">{mail.subject}</p>
                          <p className="text-[11px] font-semibold text-gray-400 mt-0.5 flex items-center">
                             <span className="truncate">{mail.recipient}</span>
                             <span className="mx-1.5">•</span>
                             <span>{mail.date}</span>
                          </p>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-brand-600 transition-colors" size={18} />
                      </div>
                    ))}
                    {mails.length === 0 && <div className="text-center py-8 text-gray-400 text-sm font-medium">Belum ada data arsip</div>}
                  </div>
                </div>

                {/* Quick Actions (Desktop & Mobile) */}
                {user.role === Role.ADMIN && (
                  <div className="bg-gradient-to-br from-brand-600 to-indigo-700 p-1 rounded-[2rem] shadow-xl overflow-hidden">
                    <div className="bg-white h-full rounded-[1.8rem] p-6 md:p-8 relative overflow-hidden flex flex-col justify-center">
                       <div className="absolute -top-10 -right-10 p-8 opacity-[0.03] pointer-events-none"><Plus size={200} /></div>
                       <h3 className="text-lg font-bold text-gray-800 mb-6 z-10">Aksi Cepat</h3>
                       <div className="grid grid-cols-1 gap-4 z-10">
                         <button onClick={() => handleOpenAdd(MailType.INCOMING)} className="flex items-center p-4 bg-blue-50/50 border border-blue-100 rounded-2xl hover:shadow-lg transition-all active:scale-95 group text-left">
                           <div className="bg-white p-3 rounded-xl mr-4 shadow-sm group-hover:rotate-12 transition-all text-blue-600"><Inbox size={24} /></div>
                           <div><p className="font-bold text-gray-800 text-sm">Input Masuk</p><p className="text-[10px] text-gray-500 font-medium">Catat surat diterima</p></div>
                         </button>
                         <button onClick={() => handleOpenAdd(MailType.OUTGOING)} className="flex items-center p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl hover:shadow-lg transition-all active:scale-95 group text-left">
                           <div className="bg-white p-3 rounded-xl mr-4 shadow-sm group-hover:-rotate-12 transition-all text-indigo-600"><Send size={24} /></div>
                           <div><p className="font-bold text-gray-800 text-sm">Input Keluar</p><p className="text-[10px] text-gray-500 font-medium">Catat surat dikirim</p></div>
                         </button>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full animate-in slide-in-from-bottom-5 duration-500">
               
               {/* === MOBILE CARD VIEW (Hybrid) === */}
               <div className="md:hidden space-y-4">
                  {filteredMails.map(mail => (
                    <div key={mail.id} className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100 flex flex-col gap-3 active:scale-[0.99] transition-transform">
                       <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                             <div className={`p-2.5 rounded-xl ${mail.type === MailType.INCOMING ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                {mail.type === MailType.INCOMING ? <Inbox size={18} /> : <Send size={18} />}
                             </div>
                             <div>
                                <p className="text-xs font-bold text-gray-900">{mail.referenceNumber}</p>
                                <p className="text-[10px] text-gray-500 font-medium">{mail.date}</p>
                             </div>
                          </div>
                          <span className="bg-gray-50 text-gray-500 text-[9px] px-2.5 py-1 rounded-lg font-bold border border-gray-200">{mail.archiveCode || '-'}</span>
                       </div>
                       
                       <div className="py-1">
                          <p className="font-bold text-gray-800 text-sm leading-snug line-clamp-3">{mail.subject}</p>
                          <div className="flex items-center mt-2 text-xs text-gray-500 font-medium bg-gray-50 p-2 rounded-lg">
                             <UserIcon size={12} className="mr-1.5 text-gray-400" />
                             <span className="truncate">{mail.recipient}</span>
                          </div>
                       </div>

                       <div className="grid grid-cols-3 gap-2 pt-2 mt-1">
                          <button onClick={() => { setViewingMail(mail); setIsViewModalOpen(true); }} className="col-span-1 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold flex items-center justify-center active:bg-gray-800">
                             Detail
                          </button>
                          {user.role === Role.ADMIN ? (
                             <>
                                <button onClick={() => handleEdit(mail)} className="col-span-1 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100">
                                   Edit
                                </button>
                                <button onClick={() => handleDelete(mail.id)} className="col-span-1 py-2.5 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100">
                                   Hapus
                                </button>
                             </>
                          ) : (
                             <div className="col-span-2"></div>
                          )}
                       </div>
                    </div>
                  ))}
                  {filteredMails.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                       <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Filter size={24} className="opacity-40" />
                       </div>
                       <p className="text-sm font-medium">Tidak ada data ditemukan</p>
                    </div>
                  )}
               </div>

               {/* === DESKTOP TABLE VIEW === */}
               <div className="hidden md:block bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100 text-left">
                        <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Nomor Surat</th>
                        <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Tanggal</th>
                        <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[280px]">Perihal</th>
                        <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{currentView === 'INCOMING' ? 'Pengirim' : 'Penerima'}</th>
                        <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Arsip</th>
                        <th className="px-6 py-5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredMails.map(mail => (
                        <tr key={mail.id} className="hover:bg-brand-50/30 transition-colors group">
                          <td className="px-6 py-5 whitespace-nowrap">
                            <p className="text-sm font-bold text-gray-800">{mail.referenceNumber}</p>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-center">
                            <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">{mail.date}</span>
                          </td>
                          <td className="px-6 py-5"><p className="text-sm font-medium text-gray-700 leading-relaxed line-clamp-2">{mail.subject}</p></td>
                          <td className="px-6 py-5"><p className="text-sm font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded-md inline-block">{mail.recipient}</p></td>
                          <td className="px-6 py-5">
                            <span className="font-mono text-[9px] bg-gray-100 px-2.5 py-1 rounded-md text-gray-600 border border-gray-200 font-bold">{mail.archiveCode || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-5 text-right space-x-2 whitespace-nowrap">
                            <button onClick={() => { setViewingMail(mail); setIsViewModalOpen(true); }} className="p-2.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all active:scale-95" title="Lihat"><Eye size={18} /></button>
                            {user.role === Role.ADMIN && (
                              <>
                                <button onClick={() => handleEdit(mail)} className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95" title="Edit"><Edit size={18} /></button>
                                <button onClick={() => handleDelete(mail.id)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95" title="Hapus"><Trash2 size={18} /></button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredMails.length === 0 && <tr><td colSpan={6} className="py-24 text-center text-gray-400 px-6"><div className="bg-slate-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4"><Inbox size={40} className="opacity-20" /></div><p className="font-bold text-sm uppercase tracking-wider">Tidak ada arsip ditemukan</p></td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL INPUT (Mobile Responsive) */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingMail ? 'Edit Arsip' : 'Input Arsip Baru'}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <DatePicker label="Tanggal Surat" value={formData.date || ''} onChange={val => setFormData({...formData, date: val})} required />
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Nomor Surat</label>
              <input required type="text" className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-xl outline-none text-sm transition-all font-medium border" value={formData.referenceNumber} onChange={e => setFormData({...formData, referenceNumber: e.target.value})} placeholder="Contoh: 005/SD/2026" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{formData.type === MailType.INCOMING ? 'Diterima Dari' : 'Dikirim Kepada'}</label>
            <input required type="text" className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-xl outline-none text-sm transition-all font-medium border" value={formData.recipient} onChange={e => setFormData({...formData, recipient: e.target.value})} placeholder="Instansi / Nama Terkait" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Perihal / Ringkasan Isi</label>
            <textarea required rows={3} className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-2xl outline-none text-sm transition-all font-medium border" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="Jelaskan secara singkat perihal surat..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Kode Klasifikasi</label>
              <input type="text" className="w-full px-4 py-3 bg-gray-100 border-transparent rounded-xl text-gray-500 outline-none text-sm font-mono cursor-not-allowed" value={formData.archiveCode} disabled placeholder="Auto-generated" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Link Dokumen (G-Drive)</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="url" className="w-full pl-10 pr-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-xl outline-none text-sm font-medium border" value={formData.fileLink} onChange={e => setFormData({...formData, fileLink: e.target.value})} placeholder="https://drive.google.com/..." />
              </div>
            </div>
          </div>
          
           {/* Drive Button in Modal */}
           <div className="p-1">
             <button 
                type="button" 
                onClick={handleOpenDrive}
                className="w-full flex items-center justify-center space-x-2 bg-blue-50 text-blue-700 py-3.5 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all font-bold text-sm shadow-sm active:scale-95"
              >
                <HardDrive size={18} />
                <span>Buka Google Drive</span>
                <ExternalLink size={14} className="ml-1 opacity-50" />
              </button>
           </div>

          <div className="pt-6 mt-2 border-t border-gray-100 flex justify-end space-x-3 sticky bottom-0 bg-white pb-2 md:pb-0">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-gray-600 font-bold text-sm hover:bg-gray-100 rounded-xl transition-all active:scale-95">Batal</button>
            <button type="submit" disabled={isSaving} className="px-8 py-3 bg-gray-900 text-white font-bold text-sm rounded-xl shadow-lg shadow-gray-900/20 active:scale-95 flex items-center hover:bg-black transition-all">{isSaving && <Loader2 size={16} className="animate-spin mr-2" />}{isSaving ? 'Menyimpan...' : 'Simpan Data'}</button>
          </div>
        </form>
      </Modal>

      {/* MODAL VIEW (Mobile Responsive) */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Detail Arsip Surat">
        {viewingMail && (
          <div className="space-y-6 md:space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
              <div className="flex-1">
                <span className={`inline-block px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest mb-3 border ${viewingMail.type === MailType.INCOMING ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                  {viewingMail.type === MailType.INCOMING ? 'SURAT MASUK' : 'SURAT KELUAR'}
                </span>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">{viewingMail.subject}</h3>
                <p className="mt-3 text-sm font-bold text-gray-400 uppercase flex items-center">{viewingMail.referenceNumber} • {viewingMail.date}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Entitas</p><p className="font-bold text-gray-800 text-sm">{viewingMail.recipient}</p></div>
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Kode Arsip</p><p className="font-mono font-bold text-brand-600 text-sm">{viewingMail.archiveCode || '-'}</p></div>
            </div>
            {viewingMail.description && (
               <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center"><AlignLeft size={12} className="mr-1"/> Keterangan</p>
                 <p className="font-medium text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{viewingMail.description}</p>
               </div>
            )}
            {viewingMail.fileLink && (
              <div className="bg-emerald-50 border border-emerald-100 p-5 md:p-6 rounded-[1.5rem] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center space-x-4 w-full sm:w-auto">
                  <div className="bg-white p-3 rounded-2xl text-emerald-600 shadow-sm shrink-0"><Paperclip size={24} /></div>
                  <div className="min-w-0">
                    <p className="font-black text-emerald-900 text-sm truncate">File Lampiran</p>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Dokumen Digital Tersedia</p>
                  </div>
                </div>
                <a href={viewingMail.fileLink} target="_blank" rel="noreferrer" className="w-full sm:w-auto bg-white text-emerald-700 px-6 py-3.5 rounded-xl font-bold text-xs shadow-sm hover:shadow-md transition-all flex items-center justify-center active:scale-95 border border-emerald-100 group">
                   <ExternalLink size={14} className="mr-2 group-hover:rotate-45 transition-transform" /> Buka File
                </a>
              </div>
            )}
            <button onClick={() => setIsViewModalOpen(false)} className="w-full py-4 bg-gray-900 text-white font-bold text-sm rounded-2xl shadow-xl active:scale-[0.98] transition-all hover:bg-black">Tutup Detail</button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default App;
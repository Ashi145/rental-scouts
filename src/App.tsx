import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/common/Navbar.tsx';
import { Footer } from './components/common/Footer.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { SearchPage } from './pages/SearchPage.tsx';
import { PropertyDetailPage } from './pages/PropertyDetailPage.tsx';
import { TenantDashboard } from './pages/TenantDashboard.tsx';
import { LandlordDashboard } from './pages/LandlordDashboard.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';
import { SafetyPage } from './pages/SafetyPage.tsx';
import { FaqPage } from './pages/FaqPage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import { ContactPage } from './pages/ContactPage.tsx';
import { LegalPage } from './pages/LegalPage.tsx';
import { ErrorPage } from './pages/ErrorPages.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { MobileBottomNav } from './components/common/MobileBottomNav.tsx';

function MainApp() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('home');
  const [currentParam, setCurrentParam] = useState<string | undefined>(undefined);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authRole, setAuthRole] = useState<'TENANT' | 'LANDLORD'>('TENANT');

  // Parse path on initial load and handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/' || path === '') {
        setCurrentView('home');
      } else if (path === '/search') {
        setCurrentView('search');
        setCurrentParam(window.location.search);
      } else if (path.startsWith('/property/')) {
        const slug = path.replace('/property/', '');
        setCurrentView('property');
        setCurrentParam(slug);
      } else if (path === '/dashboard/tenant' || path === '/tenant-dashboard') {
        setCurrentView('tenant-dashboard');
      } else if (path === '/dashboard/landlord' || path === '/landlord-dashboard') {
        setCurrentView('landlord-dashboard');
      } else if (path === '/admin' || path === '/admin-dashboard') {
        setCurrentView('admin-dashboard');
      } else if (path === '/safety') {
        setCurrentView('safety');
      } else if (path === '/faq') {
        setCurrentView('faq');
      } else if (path === '/about') {
        setCurrentView('about');
      } else if (path === '/contact') {
        setCurrentView('contact');
      } else if (path === '/terms') {
        setCurrentView('terms');
      } else if (path === '/privacy') {
        setCurrentView('privacy');
      } else {
        setCurrentView('home');
      }
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (view: string, param?: string) => {
    setCurrentView(view);
    setCurrentParam(param);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    let url = '/';
    if (view === 'search') {
      url = param ? `/search?${param}` : '/search';
    } else if (view === 'property' && param) {
      url = `/property/${param}`;
    } else if (view === 'tenant-dashboard') {
      url = '/dashboard/tenant';
    } else if (view === 'landlord-dashboard') {
      url = '/dashboard/landlord';
    } else if (view === 'admin-dashboard') {
      url = '/admin';
    } else if (['safety', 'faq', 'about', 'contact', 'terms', 'privacy'].includes(view)) {
      url = `/${view}`;
    } else if (view === 'auth') {
      setAuthMode(param === 'register' || param === 'landlord' ? 'register' : 'login');
      if (param === 'landlord') setAuthRole('LANDLORD');
      setAuthModalOpen(true);
      return;
    }

    try {
      window.history.pushState({}, '', url);
    } catch {
      // ignore
    }
  };

  const handleOpenAuth = (mode: 'login' | 'register', role: 'TENANT' | 'LANDLORD' = 'TENANT') => {
    setAuthMode(mode);
    setAuthRole(role);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-slate-900 font-sans antialiased">
      <Navbar currentView={currentView} onNavigate={navigate} />

      <main className="flex-1">
        {currentView === 'home' && (
          <HomePage
            onNavigate={navigate}
            onSelectProperty={slug => navigate('property', slug)}
          />
        )}

        {currentView === 'search' && (
          <SearchPage
            initialSearchQuery={currentParam}
            onNavigate={navigate}
            onSelectProperty={slug => navigate('property', slug)}
          />
        )}

        {currentView === 'property' && currentParam && (
          <PropertyDetailPage
            slugOrId={currentParam}
            onNavigate={navigate}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {currentView === 'tenant-dashboard' && (
          <TenantDashboard
            onNavigate={navigate}
            onSelectProperty={slug => navigate('property', slug)}
          />
        )}

        {currentView === 'landlord-dashboard' && (
          <LandlordDashboard
            initialAction={currentParam}
            onNavigate={navigate}
            onSelectProperty={slug => navigate('property', slug)}
          />
        )}

        {currentView === 'admin-dashboard' && (
          <AdminDashboard
            onNavigate={navigate}
            onSelectProperty={slug => navigate('property', slug)}
          />
        )}

        {currentView === 'safety' && <SafetyPage onNavigate={navigate} />}
        {currentView === 'faq' && <FaqPage onNavigate={navigate} />}
        {currentView === 'about' && <AboutPage onNavigate={navigate} />}
        {currentView === 'contact' && <ContactPage onNavigate={navigate} />}
        {currentView === 'terms' && <LegalPage type="terms" onNavigate={navigate} />}
        {currentView === 'privacy' && <LegalPage type="privacy" onNavigate={navigate} />}
      </main>

      <Footer onNavigate={navigate} />

      <MobileBottomNav
        currentView={currentView}
        onNavigate={navigate}
        onOpenAuth={handleOpenAuth}
      />

      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        initialRole={authRole}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

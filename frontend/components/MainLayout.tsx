'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Close mobile sidebar when switching to desktop
      if (!mobile) {
        setMobileSidebarOpen(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Link draft estimates when user logs in
  useEffect(() => {
    if (session && (session as any).backendToken) {
      linkDraftEstimates();
    }
  }, [session]);

  const linkDraftEstimates = async () => {
    const draftEstimates = localStorage.getItem('draftEstimates');
    if (draftEstimates) {
      try {
        const propertyIds = JSON.parse(draftEstimates);
        if (propertyIds.length > 0) {
          const token = (session as any).backendToken;
          await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/property-estimate/link-drafts`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ propertyIds }),
            }
          );
          localStorage.removeItem('draftEstimates');
        }
      } catch (err) {
        console.error('Failed to link draft estimates:', err);
      }
    }
  };

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/getEstimates', label: 'Get Estimates', icon: '📊' },
    { path: '/myEstimates', label: 'My Estimates', icon: '📋' },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(path);
  };

  return (
    <div className={styles.layout}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {/* Burger menu for mobile */}
          {isMobile && (
            <button
              className={styles.burgerButton}
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              aria-label="Toggle menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {mobileSidebarOpen ? (
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                ) : (
                  <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                )}
              </svg>
            </button>
          )}
          <h1 className={styles.logo} onClick={() => router.push('/')}>
            Real Estate Estimator
          </h1>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.helpButton}>Help</button>
          <button className={styles.notificationButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 16V11C18 7.93 16.37 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.64 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16ZM12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.89 22 12 22Z" fill="currentColor"/>
            </svg>
          </button>
          {session ? (
            <>
              <button className={styles.loginButton} onClick={() => signOut()}>
                Sign Out
              </button>
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className={styles.profileImage}
                />
              ) : (
                <div className={styles.profileIcon}>
                  {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
                </div>
              )}
            </>
          ) : (
            <button className={styles.loginButton} onClick={() => signIn('google')}>
              Login
            </button>
          )}
        </div>
      </header>

      <div className={styles.body}>
        {/* Mobile overlay */}
        {isMobile && mobileSidebarOpen && (
          <div 
            className={styles.overlay}
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar - Always visible with icons, expands on hover (desktop) or toggle (mobile) */}
        <aside 
          className={`${styles.sidebar} ${sidebarHovered ? styles.expanded : ''} ${isMobile && mobileSidebarOpen ? styles.mobileOpen : ''}`}
          onMouseEnter={() => !isMobile && setSidebarHovered(true)}
          onMouseLeave={() => !isMobile && setSidebarHovered(false)}
        >
          <nav className={styles.nav}>
            {navItems.map((item) => (
              <button
                key={item.path}
                className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
                onClick={() => {
                  router.push(item.path);
                  // Close mobile sidebar when navigating
                  if (isMobile) {
                    setMobileSidebarOpen(false);
                  }
                }}
                title={item.label}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}

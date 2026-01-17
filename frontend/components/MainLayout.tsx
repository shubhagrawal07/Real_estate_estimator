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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Only auto-close on mobile, but allow manual toggle
      if (mobile && sidebarOpen) {
        // Keep current state, don't force close
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

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
        {/* Sidebar Toggle - Always visible */}
        <button
          className={styles.sidebarToggle}
          style={{ left: sidebarOpen ? '250px' : '0' }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
        
        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
          <nav className={styles.nav}>
            {navItems.map((item) => (
              <button
                key={item.path}
                className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
                onClick={() => router.push(item.path)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {sidebarOpen && <span className={styles.navLabel}>{item.label}</span>}
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

'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { propertyEstimateService } from '@/services/property-estimate.service';
import { sellerAlertService } from '@/services/seller-alert.service';
import type { SellerAlertItem } from '@/types/estimate';
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
  const [alerts, setAlerts] = useState<SellerAlertItem[]>([]);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const alertsRef = useRef<HTMLDivElement>(null);

  const token = session?.backendToken;

  // Fetch seller alerts when logged in
  useEffect(() => {
    if (!token) {
      setAlerts([]);
      return;
    }
    sellerAlertService
      .getAlerts(token)
      .then((data) => setAlerts(Array.isArray(data) ? data : []))
      .catch(() => setAlerts([]));
  }, [token]);

  const fetchAlerts = () => {
    if (!token) return;
    sellerAlertService
      .getAlerts(token)
      .then((data) => setAlerts(Array.isArray(data) ? data : []))
      .catch(() => setAlerts([]));
  };

  // Close alerts dropdown when clicking outside
  useEffect(() => {
    if (!alertsOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setAlertsOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [alertsOpen]);

  const handleDismissAlert = async (id: string) => {
    if (!token) return;
    try {
      await sellerAlertService.markAsRead(id, token);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // Silent fail
    }
  };

  const formatAlertMessage = (alert: SellerAlertItem): string => {
    if (alert.type === 'buyer_above_trigger') {
      const budget = alert.payload && typeof alert.payload.budget === 'number'
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(alert.payload.budget)
        : null;
      const budgetPart = budget ? `with budget ${budget} ` : '';
      const base = `A new buyer arrived ${budgetPart}that might be interested in your property`;
      return alert.address ? `${base}: ${alert.address}` : `${base}.`;
    }
    return alert.address ?? alert.propertyId;
  };

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

  useEffect(() => {
    if (token) {
      linkDraftEstimates();
    }
  }, [token]);

  const linkDraftEstimates = async () => {
    const draftEstimates = localStorage.getItem('draftEstimates');
    if (!draftEstimates || !token) return;
    try {
      const propertyIds = JSON.parse(draftEstimates) as string[];
      if (propertyIds.length > 0) {
        await propertyEstimateService.linkDrafts(propertyIds, token);
        localStorage.removeItem('draftEstimates');
      }
    } catch {
      // Silent fail for link drafts
    }
  };

  const userRole = session?.userRole;

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/getEstimates', label: 'Get Estimates', icon: '📊' },
    { path: '/myEstimates', label: 'Properties', icon: '📋' },
    { path: '/buyerSearch', label: 'Search Properties', icon: '🔍' },
    // Admin-only items
    ...(userRole === 'admin' ? [
      { path: '/fetchSalesData', label: 'Fetch sales data', icon: '📥' },
    ] : []),
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
        <div className={styles.headerRow}>
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
              OffMarket
            </h1>
          </div>
          <div className={styles.headerCtas}>
            <button
              type="button"
              className={styles.headerPrimaryCta}
              onClick={() => router.push('/getEstimates')}
            >
              Estimate my property
            </button>
            <button
              type="button"
              className={styles.headerSecondaryCta}
              onClick={() => router.push('/buyerSearch')}
            >
              I&apos;m looking to buy
            </button>
          </div>
          <div className={styles.headerSpacer} aria-hidden />
          <div className={styles.headerRight}>
          <button className={styles.helpButton}>Help</button>
          {session && (
            <div className={styles.notificationWrap} ref={alertsRef}>
              <button
                type="button"
                className={styles.notificationButton}
                onClick={(e) => {
                  e.stopPropagation();
                  setAlertsOpen((open) => {
                    const next = !open;
                    if (next) fetchAlerts();
                    return next;
                  });
                }}
                aria-label={alerts.length > 0 ? `${alerts.length} notifications` : 'Notifications'}
                aria-expanded={alertsOpen}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 16V11C18 7.93 16.37 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.64 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16ZM12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.89 22 12 22Z" fill="currentColor"/>
                </svg>
                {alerts.length > 0 && (
                  <span className={styles.notificationBadge} aria-hidden="true">
                    {alerts.length > 99 ? '99+' : alerts.length}
                  </span>
                )}
              </button>
              {alertsOpen && (
                <div className={styles.notificationDropdown}>
                  <div className={styles.notificationDropdownHeader}>
                    Notifications
                  </div>
                  {alerts.length === 0 ? (
                    <p className={styles.notificationEmpty}>No new notifications</p>
                  ) : (
                    <ul className={styles.notificationList}>
                      {alerts.map((alert) => (
                        <li key={alert.id} className={styles.notificationItem}>
                          <p className={styles.notificationMessage}>
                            {formatAlertMessage(alert)}
                          </p>
                          <button
                            type="button"
                            className={styles.notificationDismiss}
                            onClick={() => handleDismissAlert(alert.id)}
                          >
                            Dismiss
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
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

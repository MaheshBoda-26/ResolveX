import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const location = useLocation();

  const navItems = [
    {
      label: 'Overview',
      path: '/',
      icon: 'dashboard',
      exact: true,
    },
    {
      label: 'Handoff Queue',
      path: '/handoffs',
      icon: 'front_hand',
      badge: '3',
    },
    {
      label: 'Support Chat',
      path: '/chat',
      icon: 'chat',
    },
    {
      label: 'Case Audit (RX-10482)',
      path: '/cases/RX-10482',
      icon: 'work',
    },
    {
      label: 'Agent Trace Log',
      path: '/trace',
      icon: 'terminal',
    },
    {
      label: 'AI Evaluations',
      path: '/evaluations',
      icon: 'fact_check',
    },
    {
      label: 'Customer Portal',
      path: '/support',
      icon: 'contact_support',
    },
  ];

  const isPathActive = (path: string, exact = false) => {
    if (exact) {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-[48px] h-[calc(100vh-48px)] w-[260px] z-40 bg-surface-bright dark:bg-inverse-surface border-r border-outline-variant/60 dark:border-outline flex flex-col transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Brand Block */}
        <div className="p-4 border-b border-outline-variant/60 dark:border-outline mb-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container shadow-xs" aria-hidden="true">
            <span className="material-symbols-outlined">psychiatry</span>
          </div>
          <div>
            <div className="font-semibold text-base text-primary dark:text-primary-fixed-dim leading-tight">
              ResolveX Engine
            </div>
            <div className="text-xs text-on-surface-variant font-medium">
              Enterprise Operations
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1 scrollbar-thin" aria-label="Sidebar navigation">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider" aria-hidden="true">
            Navigation
          </div>

          {navItems.map((item) => {
            const active = isPathActive(item.path, item.exact);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                  active
                    ? 'bg-primary-container/20 text-primary dark:text-primary-fixed-dim border-l-4 border-primary font-semibold shadow-xs'
                    : 'text-on-surface-variant dark:text-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-variant'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      active ? 'text-primary dark:text-primary-fixed-dim' : ''
                    }`}
                    style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary-container text-on-primary-container" aria-label={`${item.badge} items`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Engine Status */}
        <div className="p-3 border-t border-outline-variant/60 dark:border-outline bg-surface-container-low/40 dark:bg-surface-container-highest/20" aria-live="polite">
          <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true"></span>
              Autonomous Engine
            </span>
            <span className="font-mono text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded">
              v2.4-active
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant/80">
            94.2% AI Resolution • Grounded in Policy
          </p>
        </div>
      </aside>
    </>
  );
}

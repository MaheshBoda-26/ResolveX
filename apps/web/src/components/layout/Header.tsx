import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '@/lib/theme';
import { useState } from 'react';

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
}

export function Header({ onToggleMobileSidebar }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const isActive = (path: string) => {
    if (path === '/' && (location.pathname === '/' || location.pathname === '/dashboard')) return true;
    return location.pathname.startsWith(path) && path !== '/';
  };

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-4 md:px-6 h-[48px] bg-surface dark:bg-inverse-surface border-b border-outline-variant/60 dark:border-outline">
      {/* Brand & Mobile Menu Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1 text-on-surface-variant hover:bg-surface-container rounded-lg"
          aria-label="Toggle Navigation"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary dark:text-primary-fixed-dim hover:opacity-90 transition-opacity">
          <span className="material-symbols-outlined text-primary dark:text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>
            support_agent
          </span>
          <span>ResolveX</span>
        </Link>
      </div>

      {/* Center Nav Links (Wireframe layout) */}
      <div className="hidden md:flex gap-4 absolute left-1/2 -translate-x-1/2">
        <Link
          to="/"
          className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
            isActive('/')
              ? 'text-primary font-bold border-b-2 border-primary dark:text-primary-fixed-dim'
              : 'text-on-surface-variant dark:text-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">dashboard</span> Operations
        </Link>
        <Link
          to="/chat"
          className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
            isActive('/chat')
              ? 'text-primary font-bold border-b-2 border-primary dark:text-primary-fixed-dim'
              : 'text-on-surface-variant dark:text-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">chat</span> Support Chat
        </Link>
        <Link
          to="/support"
          className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
            isActive('/support')
              ? 'text-primary font-bold border-b-2 border-primary dark:text-primary-fixed-dim'
              : 'text-on-surface-variant dark:text-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">contact_support</span> Customer Portal
        </Link>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:flex items-center">
          <span className="material-symbols-outlined absolute left-2 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cases, traces, logs..."
            className="pl-8 pr-3 py-1 bg-surface-container-low dark:bg-surface-container-highest border border-outline-variant/60 rounded focus:border-primary focus:ring-2 focus:ring-primary/10 text-xs w-44 md:w-56 text-on-surface placeholder:text-on-surface-variant/60 transition-all outline-none"
          />
        </div>

        {/* Notifications */}
        <button
          className="p-1.5 text-on-surface-variant dark:text-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest transition-colors rounded-full relative"
          title="Notifications"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 text-on-surface-variant dark:text-surface-variant hover:bg-surface-container-low dark:hover:bg-surface-container-highest transition-colors rounded-full"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* User Avatar */}
        <div className="w-7 h-7 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs border border-outline-variant shadow-sm cursor-pointer ml-1">
          RX
        </div>
      </div>
    </header>
  );
}

import React from 'react';
import { ViewMode } from '../../types';
import { Code, Settings, LayoutGrid, Server, Bot, Package } from 'lucide-react';
import clsx from 'clsx';

interface BottomNavProps {
  currentView: ViewMode;
  setView: (view: ViewMode) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView }) => {
  const navItems = [
    { id: 'projects', icon: LayoutGrid, label: 'Home' },
    { id: 'editor', icon: Code, label: 'Code' },
    { id: 'preview', icon: Server, label: 'Run' },
    { id: 'ai', icon: Bot, label: 'AI' },
    { id: 'export', icon: Package, label: 'Build' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const handleNavClick = (id: string) => {
    if (id === 'projects') {
        setView('dashboard');
    } else {
        setView(id as ViewMode);
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-pb shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 transition-colors">
      <div className="flex justify-around items-center h-16 px-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id || (item.id === 'projects' && currentView === 'dashboard');
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={clsx(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 active:scale-95",
                isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              <div className={clsx(
                  "p-1.5 rounded-xl transition-colors",
                  isActive ? "bg-blue-50 dark:bg-blue-900/20" : "bg-transparent"
              )}>
                 <Icon className={clsx("w-5 h-5", isActive && "fill-current opacity-100 stroke-current stroke-2")} />
              </div>
              <span className="text-[10px] font-medium tracking-wide opacity-80">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
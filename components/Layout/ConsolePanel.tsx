import React, { useEffect, useRef } from 'react';
import { ConsoleMessage } from '../../types';
import { X, Trash2, Terminal, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

interface ConsolePanelProps {
  logs: ConsoleMessage[];
  onClose: () => void;
  onClear: () => void;
}

const ConsolePanel: React.FC<ConsolePanelProps> = ({ logs, onClose, onClear }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getIcon = (type: ConsoleMessage['type']) => {
      switch(type) {
          case 'error': return <AlertTriangle className="w-3 h-3 text-red-500" />;
          case 'warn': return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
          case 'info': return <Info className="w-3 h-3 text-blue-500" />;
          case 'system': return <Terminal className="w-3 h-3 text-purple-500" />;
          default: return <CheckCircle className="w-3 h-3 text-gray-400" />;
      }
  };

  return (
    <div className="h-48 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] flex flex-col shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-all z-20 animate-in slide-in-from-bottom duration-200">
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-[#252526]">
            <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">Console / Server Logs</span>
                <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 rounded-full text-gray-600 dark:text-gray-400">{logs.length}</span>
            </div>
            <div className="flex items-center space-x-2">
                <button 
                  onClick={onClear} 
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500"
                  title="Clear Console"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={onClose} 
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
            {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                    <Terminal className="w-8 h-8 mb-2" />
                    <p>No logs to display</p>
                </div>
            )}
            {logs.map((log) => (
                <div key={log.id} className={clsx(
                    "flex items-start space-x-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800",
                    log.type === 'error' ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10" : 
                    log.type === 'warn' ? "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/10" :
                    log.type === 'system' ? "text-purple-600 dark:text-purple-400" :
                    "text-gray-700 dark:text-gray-300"
                )}>
                    <div className="mt-0.5">{getIcon(log.type)}</div>
                    <div className="flex-1 break-all">
                        <span className="opacity-50 mr-2 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        {log.message}
                    </div>
                </div>
            ))}
            <div ref={endRef} />
        </div>
    </div>
  );
};

export default ConsolePanel;
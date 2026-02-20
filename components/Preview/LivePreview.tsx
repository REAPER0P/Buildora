import React, { useEffect, useState, useMemo } from 'react';
import { Project, ConsoleMessage } from '../../types';
import { RefreshCw, Monitor, Smartphone, StopCircle, Play } from 'lucide-react';
import clsx from 'clsx';

interface LivePreviewProps {
  project: Project;
  onConsoleLog?: (type: ConsoleMessage['type'], msg: string) => void;
}

const LivePreview: React.FC<LivePreviewProps> = ({ project, onConsoleLog }) => {
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [isRunning, setIsRunning] = useState(true);
  const [key, setKey] = useState(0);

  // Auto-detect mobile device to switch to "desktop" (full width) mode
  useEffect(() => {
    if (window.innerWidth < 768) {
      setDevice('desktop');
    }
  }, []);

  const previewContent = useMemo(() => {
    if (!isRunning) {
        return '<body style="background:#f3f4f6;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;color:#6b7280;">Server Stopped</body>';
    }

    const indexFile = project.files.find(f => f.name === 'index.html' || f.name === 'index.php');
    if (!indexFile) return '<html><body><h1 style="font-family:sans-serif;text-align:center;margin-top:20px;">No index file found</h1></body></html>';

    let content = indexFile.content;

    // Resolve CSS
    project.files.filter(f => f.name.endsWith('.css')).forEach(css => {
       content = content.replace(
         new RegExp(`<link[^>]*href=["'](.*?\/)?${css.name}["'][^>]*>`, 'g'), 
         `<style>${css.content}</style>`
       );
    });

    // Resolve JS
    project.files.filter(f => f.name.endsWith('.js')).forEach(js => {
       content = content.replace(
         new RegExp(`<script[^>]*src=["'](.*?\/)?${js.name}["'][^>]*><\/script>`, 'g'), 
         `<script>${js.content}</script>`
       );
    });
    
    // Resolve Images
    project.files.filter(f => f.language === 'image').forEach(img => {
        content = content.replace(
            new RegExp(`src=["'](.*?\/)?${img.name}["']`, 'g'),
            `src="${img.content}"`
        );
    });

    // Inject Console Interceptor
    const consoleScript = `
      <script>
        (function() {
            var oldLog = console.log;
            var oldError = console.error;
            var oldWarn = console.warn;
            var oldInfo = console.info;

            function send(type, args) {
                try {
                    var msg = Array.from(args).map(a => {
                        if(typeof a === 'object') return JSON.stringify(a);
                        return String(a);
                    }).join(' ');
                    window.parent.postMessage({ type: 'CONSOLE_LOG', level: type, message: msg }, '*');
                } catch(e) {}
            }

            console.log = function() { send('log', arguments); oldLog.apply(console, arguments); };
            console.error = function() { send('error', arguments); oldError.apply(console, arguments); };
            console.warn = function() { send('warn', arguments); oldWarn.apply(console, arguments); };
            console.info = function() { send('info', arguments); oldInfo.apply(console, arguments); };
            
            window.onerror = function(msg, url, line) {
                send('error', [msg + ' (Line: ' + line + ')']);
            };
        })();
      </script>
    `;
    content = content.replace('<head>', '<head>' + consoleScript);

    // PHP Simulation
    if (project.type === 'php') {
        content = content.replace(/<\?php\s+echo\s+["'](.*?)["'];\s*\?>/g, '$1');
        content = content.replace(/<\?php\s+echo\s+\$(.*?);\s*\?>/g, '{{Variable: $1}}');
        content = content.replace(/<\?php[\s\S]*?\?>/g, '');
        content = `
          <div style="background:#fff3cd; color:#856404; padding:8px; font-size:12px; text-align:center; font-family:sans-serif; border-bottom:1px solid #ffeeba;">
            Buildora Local PHP Server (Simulated) &bull; Static Output Only
          </div>
          ${content}
        `;
    }

    return content;
  }, [project, isRunning, key]);

  // Console Listener
  useEffect(() => {
      const handler = (event: MessageEvent) => {
          if (event.data && event.data.type === 'CONSOLE_LOG' && onConsoleLog) {
              onConsoleLog(event.data.level, event.data.message);
          }
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
  }, [onConsoleLog]);

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex justify-between items-center shadow-sm z-10">
         <div className="flex items-center space-x-2">
           <button 
              onClick={() => setKey(k => k + 1)} 
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              title="Reload"
            >
              <RefreshCw className="w-4 h-4" />
           </button>
           <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button 
                onClick={() => setDevice('mobile')}
                className={clsx("p-1.5 rounded-md transition-all", device === 'mobile' ? "bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300" : "text-gray-500 dark:text-gray-400 hover:text-gray-700")}
              >
                <Smartphone className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setDevice('desktop')}
                className={clsx("p-1.5 rounded-md transition-all", device === 'desktop' ? "bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-300" : "text-gray-500 dark:text-gray-400 hover:text-gray-700")}
              >
                <Monitor className="w-4 h-4" />
              </button>
           </div>
         </div>
         
         <div className="hidden sm:flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
            <div className={clsx("w-2 h-2 rounded-full", isRunning ? "bg-green-500 animate-pulse" : "bg-red-500")}></div>
            <span className="font-medium">{isRunning ? "Server: Running" : "Server: Stopped"}</span>
         </div>

         <button 
            onClick={() => setIsRunning(!isRunning)} 
            className={clsx("p-2 rounded-full transition-colors", isRunning ? "text-red-500 hover:bg-red-50" : "text-green-500 hover:bg-green-50")}
            title={isRunning ? "Stop Server" : "Start Server"}
         >
            {isRunning ? <StopCircle className="w-5 h-5" /> : <Play className="w-5 h-5" />}
         </button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto flex justify-center items-start p-4 sm:p-8">
         <div 
           className={clsx(
             "bg-white shadow-2xl transition-all duration-300 border-8 border-gray-800 dark:border-gray-700 relative overflow-hidden",
             device === 'mobile' ? "w-[375px] h-[667px] rounded-[3rem]" : "w-full h-full max-w-5xl rounded-lg border-4"
           )}
         >
            {device === 'mobile' && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 dark:bg-gray-700 rounded-b-xl z-20"></div>
            )}
            <iframe 
                key={key}
                title="Preview"
                srcDoc={previewContent}
                className="w-full h-full bg-white"
                sandbox="allow-scripts allow-modals allow-same-origin"
            />
         </div>
      </div>
    </div>
  );
};

export default LivePreview;
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
  const [isNativeMobile, setIsNativeMobile] = useState(false);

  // Auto-detect mobile device
  useEffect(() => {
    const checkMobile = () => {
        if (window.innerWidth < 768) {
            setIsNativeMobile(true);
            setDevice('desktop'); // Default to full width on mobile
        } else {
            setIsNativeMobile(false);
        }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors">
      {/* Preview Area - Clean and Full Width/Height */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
         <iframe 
             key={key}
             title="Preview"
             srcDoc={previewContent}
             className="w-full h-full bg-white"
             sandbox="allow-scripts allow-modals allow-same-origin"
             style={{ border: 'none', overflow: 'auto' }}
         />
      </div>
    </div>
  );
};

export default LivePreview;
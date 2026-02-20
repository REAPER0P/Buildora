import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, Project, File } from '../../types';
import { X, Sparkles, AlertCircle, Terminal as TerminalIcon, Cpu } from 'lucide-react';
import clsx from 'clsx';

interface AIGeneratorModalProps {
  settings: AppSettings;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({ settings, onClose, onProjectCreated }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const generateTool = async () => {
    if (!prompt.trim()) return;
    if (!settings.openRouterApiKey) {
      setError("OpenRouter API Key is missing. Please add it in Settings.");
      return;
    }

    setLoading(true);
    setError(null);
    setLogs([]); // Clear previous logs
    
    addLog("Initializing AI Designer v2025...");
    addLog("Loading aesthetic parameters...");

    try {
      // 1. Prepare Prompt
      addLog("Analyzing user prompt & enforcing modern design rules...");
      
      const systemPrompt = `You are an elite UI/UX designer and frontend developer specializing in 2025 web design trends.

STRICT DESIGN REQUIREMENTS (MANDATORY):
- Use glassmorphism (frosted glass effects with backdrop-filter)
- OR neumorphism (soft extruded shapes with dual shadows)
- OR modern gradients with vibrant colors
- Include smooth animations and micro-interactions (hover effects, transitions)
- Use modern fonts (Inter, Poppins, Clash Display) via Google Fonts
- Implement asymmetric layouts with creative whitespace
- Add subtle shadows with proper layering
- Mobile-first responsive design
- Use Tailwind CSS with modern utility classes
- Include dark mode support where appropriate
- Add micro-interactions (buttons that lift, cards that glow on hover)
- Use modern color palettes (warm neutrals + vibrant accent colors)
- Make it look like Dribbble/Behance/Awwwards winning designs

FORBIDDEN ELEMENTS:
- Flat, boring designs with no depth
- Simple borders without any effect
- Outdated color schemes (pure grays, basic blues)
- No animations or transitions
- Table-based layouts
- Fonts like Arial, Times New Roman (use modern fonts instead)
- Heavy shadows without subtlety

TONE: Professional, creative, pixel-perfect. Every design should feel premium and expensive.

Generate a complete, production-ready single-page web tool based on the user's description.

STRICT OUTPUT FORMAT (MANDATORY):
NEVER combine HTML, CSS, and JavaScript in one file.
ALWAYS generate 3 separate files: index.html, style.css, script.js.

Output format MUST be exactly like this:

=== project_name ===
(Project Name)

=== index.html ===
(HTML code only)

=== style.css ===
(CSS code only)

=== script.js ===
(JavaScript code only)

Do not include any other text, explanations, or markdown code blocks. Just the raw file contents separated by the delimiters.`;

      // 2. Call OpenRouter API
      addLog(`Target Model: ${settings.openRouterModel || "default"}`);
      addLog("Connecting to OpenRouter API Gateway...");
      
      // Artificial delay to make the terminal feel "real" before the fetch blocks
      await new Promise(r => setTimeout(r, 800)); 
      addLog("Sending design generation request...");

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.openRouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.href,
          "X-Title": "Buildora",
        },
        body: JSON.stringify({
          model: settings.openRouterModel || "google/gemini-2.0-flash-lite-preview-02-05:free",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Create a web tool with a modern 2025 design: ${prompt}` }
          ],
          temperature: 0.85,
          top_p: 0.95,
          frequency_penalty: 0.3,
          presence_penalty: 0.3,
          stream: true // Enable streaming
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
            throw new Error("Invalid API Key. Please check your OpenRouter API Key in Settings.");
        }
        throw new Error(`API Error: ${response.status}`);
      }

      addLog("Response received. Streaming content...");
      
      if (!response.body) throw new Error("ReadableStream not supported by browser.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = ""; // For SSE parsing
      let lineBuffer = ""; // For terminal display

      while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || ""; // Keep incomplete SSE line
          
          for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === 'data: [DONE]') continue;
              
              if (trimmed.startsWith('data: ')) {
                  try {
                      const json = JSON.parse(trimmed.slice(6));
                      const delta = json.choices?.[0]?.delta?.content || "";
                      if (delta) {
                          fullContent += delta;
                          lineBuffer += delta;
                          
                          // Flush complete lines to terminal
                          if (lineBuffer.includes('\n')) {
                              const parts = lineBuffer.split('\n');
                              const completeLines = parts.slice(0, -1);
                              lineBuffer = parts[parts.length - 1];
                              
                              if (completeLines.length > 0) {
                                  setLogs(prev => [...prev, ...completeLines]);
                              }
                          }
                      }
                  } catch (e) {
                      // Ignore parse errors for partial chunks
                  }
              }
          }
      }
      
      // Flush remaining line buffer
      if (lineBuffer.trim()) {
          setLogs(prev => [...prev, lineBuffer]);
      }

      addLog("Stream complete. Processing files...");

      let content = fullContent;

      // Clean Markdown if present
      addLog("Sanitizing output...");
      content = content.replace(/```json/g, '').replace(/```/g, '').trim();

      // 3. Parse Delimiter Format
      addLog("Parsing generated code...");
      
      const extractFileContent = (text: string, filename: string): string => {
          // Matches === filename === ... content ... until next === or end of string
          const regex = new RegExp(`=== ${filename} ===\\s*([\\s\\S]*?)(?=\\n===|$)`, 'i');
          const match = text.match(regex);
          return match ? match[1].trim() : '';
      };

      const projectNameRaw = extractFileContent(content, 'project_name');
      const html = extractFileContent(content, 'index.html');
      const css = extractFileContent(content, 'style.css');
      const js = extractFileContent(content, 'script.js');

      if (!html && !css && !js) {
          throw new Error("Failed to parse AI response. Format mismatch.");
      }

      const safeName = (projectNameRaw || "AI_Tool").replace(/[^a-zA-Z0-9-_]/g, '');

      addLog(`Project Name resolved: ${safeName}`);
      addLog("Validating file integrity...");

      // 4. Construct Project Object
      const newFiles: File[] = [
        {
          id: Date.now().toString() + "-1",
          name: "index.html",
          content: html || "<!-- No HTML Generated -->",
          language: 'html',
          parentId: 'root'
        },
        {
          id: Date.now().toString() + "-2",
          name: "style.css",
          content: css || "/* No CSS Generated */",
          language: 'css',
          parentId: 'root'
        },
        {
          id: Date.now().toString() + "-3",
          name: "script.js",
          content: js || "// No JS Generated",
          language: 'javascript',
          parentId: 'root'
        }
      ];

      // 5. Finalize
      addLog(`\nFiles generated: ${newFiles.length}`);

      const newProject: Project = {
        id: Date.now().toString(),
        name: safeName,
        type: 'html',
        lastModified: Date.now(),
        files: newFiles
      };

      // 6. Save to App (ZIP download removed)
      addLog("Importing project to Workspace...");
      await new Promise(r => setTimeout(r, 600)); // Small delay for effect
      addLog("SUCCESS: Project created.");

      onProjectCreated(newProject);
      onClose();

    } catch (err: any) {
      console.error(err);
      addLog(`ERROR: ${err.message || "Unknown error"}`);
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!loading ? onClose : undefined}></div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
               <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
                <h2 className="font-bold text-gray-800 dark:text-white">AI Tool Generator</h2>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Powered by OpenRouter</p>
            </div>
          </div>
          {!loading && (
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto min-h-[300px]">
          {error && !loading && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-start space-x-3">
               <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
               <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {!settings.openRouterApiKey && !error && !loading && (
             <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 rounded-xl">
               <p className="text-sm text-yellow-700 dark:text-yellow-400">
                 Please configure your OpenRouter API Key in <strong>Settings</strong> to use this feature.
               </p>
             </div>
          )}

          {!loading ? (
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Describe the tool you want to build
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={loading}
                  placeholder="E.g., A mortgage calculator with dark mode, a todo list with local storage, or a color palette generator..."
                  className="w-full h-40 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none dark:bg-gray-700 dark:text-white text-sm"
                />
             </div>
          ) : (
            <div className="flex flex-col h-full space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span className="flex items-center space-x-2">
                        <TerminalIcon className="w-3 h-3" />
                        <span>Build Terminal</span>
                    </span>
                    <span className="animate-pulse flex items-center space-x-1 text-purple-600 dark:text-purple-400">
                        <Cpu className="w-3 h-3" />
                        <span>Processing</span>
                    </span>
                </div>
                <div className="flex-1 bg-gray-950 rounded-lg p-4 font-mono text-xs overflow-y-auto border border-gray-800 h-64 shadow-inner custom-scrollbar">
                    {logs.map((log, index) => (
                        <div key={index} className="mb-0.5 flex space-x-2 text-gray-300 leading-tight">
                           <span className={clsx(
                               "break-words whitespace-pre-wrap",
                               log.includes("ERROR") ? "text-red-400" :
                               log.includes("SUCCESS") ? "text-green-400 font-bold" :
                               log.includes("[") && log.includes("]") && !log.includes("---") ? "text-blue-300" : 
                               log.includes("---") ? "text-yellow-300 font-bold mt-2" : "text-gray-300 ml-2"
                           )}>
                               {log}
                           </span>
                        </div>
                    ))}
                    <div ref={logsEndRef} className="h-1" />
                    
                    {/* Blinking Cursor */}
                    <div className="flex space-x-2 mt-2">
                        <span className="text-green-500">{">"}</span>
                        <span className="w-2 h-4 bg-green-500 animate-pulse"></span>
                    </div>
                </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end">
            <button
                onClick={generateTool}
                disabled={loading || !prompt.trim() || !settings.openRouterApiKey}
                className={clsx(
                "flex items-center space-x-2 px-6 py-2.5 rounded-xl font-medium shadow-lg transition-all",
                loading || !prompt.trim() || !settings.openRouterApiKey
                    ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-purple-500/25 hover:scale-105"
                )}
            >
                <Sparkles className="w-4 h-4" />
                <span>Generate Tool</span>
            </button>
            </div>
        )}

      </div>
    </div>
  );
};

export default AIGeneratorModal;
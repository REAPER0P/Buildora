import React, { useRef, useEffect, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { File, AppSettings } from '../../types';
import { X, Loader2, AlignLeft, Sparkles, Undo, Redo } from 'lucide-react';
import clsx from 'clsx';

interface CodeEditorProps {
  file: File;
  content: string;
  onChange: (value: string) => void;
  settings: AppSettings;
  openFiles?: File[];
  activeFileId?: string;
  onTabSelect?: (file: File) => void;
  onTabClose?: (id: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ 
    file, 
    content, 
    onChange, 
    settings, 
    openFiles = [], 
    activeFileId,
    onTabSelect,
    onTabClose 
}) => {
  const editorRef = useRef<any>(null);
  
  // AI Edit State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [streamingCode, setStreamingCode] = useState('');

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Auto-format on load to ensure AI generated code looks good
    setTimeout(() => {
        editor.getAction('editor.action.formatDocument')?.run();
    }, 500);
  };

  // Update layout when sidebar or window changes
  useEffect(() => {
      const resizeListener = () => {
          if(editorRef.current) {
              editorRef.current.layout();
          }
      };
      window.addEventListener('resize', resizeListener);
      return () => window.removeEventListener('resize', resizeListener);
  }, []);

  const handleFormat = () => {
      if (editorRef.current) {
          editorRef.current.getAction('editor.action.formatDocument')?.run();
      }
  };

  const handleUndo = () => {
      if (editorRef.current) {
          editorRef.current.trigger('keyboard', 'undo', null);
      }
  };

  const handleRedo = () => {
      if (editorRef.current) {
          editorRef.current.trigger('keyboard', 'redo', null);
      }
  };

  const handleAiSubmit = async () => {
    if (!aiPrompt.trim()) return;
    if (!settings.openRouterApiKey) {
        setAiError("API Key missing in Settings");
        return;
    }
    
    setAiLoading(true);
    setAiError(null);
    setStreamingCode('');

    const systemPrompt = `You are an elite UI/UX designer and frontend developer specializing in 2025 web design trends.

STRICT DESIGN REQUIREMENTS (MANDATORY) when modifying UI/CSS/HTML:
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

Task: Modify the provided code based strictly on the user's request.
Rules:
1. Return ONLY the valid code. No markdown formatting (no \`\`\`), no explanations.
2. Preserve indentation and style where possible.
3. If the request is to fix bugs, fix them.
4. If the request is to add a feature, add it with premium design principles.`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${settings.openRouterApiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": window.location.href,
              "X-Title": "Buildora",
            },
            body: JSON.stringify({
                model: settings.openRouterModel || "stepfun/step-3.5-flash:free",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: `Current File: ${file.name}\nLanguage: ${file.language}\n\nCode:\n${content}\n\nInstruction: ${aiPrompt}`
                    }
                ],
                temperature: 0.85,
                top_p: 0.95,
                frequency_penalty: 0.3,
                presence_penalty: 0.3,
                stream: true
            })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("Invalid API Key. Please check your OpenRouter API Key in Settings.");
            }
            throw new Error(`API Error: ${response.status}`);
        }

        if (!response.body) throw new Error("ReadableStream not supported");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || ""; 
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;
                
                if (trimmed.startsWith('data: ')) {
                    try {
                        const json = JSON.parse(trimmed.slice(6));
                        const delta = json.choices?.[0]?.delta?.content || "";
                        if (delta) {
                            fullContent += delta;
                            setStreamingCode(prev => prev + delta);
                        }
                    } catch (e) {
                        // Ignore parse errors for partial chunks
                    }
                }
            }
        }

        if (!fullContent) throw new Error("No code returned from AI");
        
        // Strip markdown if AI ignores rule
        let newCode = fullContent.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '').trim();
        
        onChange(newCode);
        setShowAiModal(false);
        setAiPrompt('');
        setStreamingCode('');
        
        // Auto format after update
        setTimeout(() => {
             editorRef.current?.getAction('editor.action.formatDocument')?.run();
        }, 200);

    } catch (err: any) {
        setAiError(err.message || "Failed to generate changes");
    } finally {
        setAiLoading(false);
    }
  };

  // Map file language to Monaco language
  const getLanguage = (lang: string) => {
      switch(lang) {
          case 'js':
          case 'javascript': return 'javascript';
          case 'css': return 'css';
          case 'html': return 'html';
          case 'json': return 'json';
          case 'php': return 'php';
          case 'xml': return 'xml';
          default: return 'html';
      }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1e1e1e] text-sm relative transition-colors h-full">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between bg-gray-100 dark:bg-[#252526] border-b border-gray-200 dark:border-gray-700 h-9 px-2 shrink-0">
           {/* Tab Bar (Left) */}
           <div className="flex overflow-x-auto scrollbar-hide flex-1 mr-2">
              {openFiles.map(f => (
                  <div 
                    key={f.id}
                    onClick={() => onTabSelect && onTabSelect(f)}
                    className={clsx(
                        "flex items-center space-x-2 px-3 py-1.5 border-r border-gray-200 dark:border-gray-700 min-w-[100px] max-w-[180px] cursor-pointer group select-none text-xs",
                        f.id === activeFileId 
                            ? "bg-white dark:bg-[#1e1e1e] text-blue-600 dark:text-blue-400 border-t-2 border-t-blue-500" 
                            : "bg-gray-100 dark:bg-[#2d2d2d] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#333333]"
                    )}
                  >
                      <span className="truncate flex-1">{f.name}</span>
                      <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onTabClose && onTabClose(f.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-500 rounded"
                      >
                          <X className="w-3 h-3" />
                      </button>
                  </div>
              ))}
           </div>
           
           {/* Tools (Right) */}
           <div className="flex items-center space-x-1">
               <button 
                onClick={handleUndo}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
                title="Undo (Ctrl+Z)"
               >
                 <Undo className="w-4 h-4" />
               </button>
               <button 
                onClick={handleRedo}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
                title="Redo (Ctrl+Y)"
               >
                 <Redo className="w-4 h-4" />
               </button>
               <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
               <button 
                onClick={() => setShowAiModal(true)}
                className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded text-purple-600 dark:text-purple-400"
                title="AI Modify Code"
               >
                 <Sparkles className="w-4 h-4" />
               </button>
               <button 
                onClick={handleFormat}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
                title="Format Document (Alt+Shift+F)"
               >
                 <AlignLeft className="w-4 h-4" />
               </button>
           </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 relative overflow-hidden">
            <Editor
                height="100%"
                width="100%"
                language={getLanguage(file.language)}
                value={content}
                theme={settings.theme === 'dark' ? 'vs-dark' : 'light'}
                onChange={(value) => onChange(value || '')}
                onMount={handleEditorDidMount}
                loading={
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span className="text-xs">Loading Editor...</span>
                    </div>
                }
                options={{
                    fontSize: settings.fontSize,
                    wordWrap: settings.wordWrap ? 'on' : 'off',
                    minimap: { enabled: false }, // Disabled for mobile optimization
                    automaticLayout: true,
                    formatOnPaste: true,
                    formatOnType: true,
                    autoClosingBrackets: 'always',
                    autoClosingQuotes: 'always',
                    tabSize: 2,
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    renderWhitespace: 'selection',
                    fontFamily: '"JetBrains Mono", monospace',
                    padding: { top: 16, bottom: 16 },
                    cursorBlinking: 'smooth',
                    smoothScrolling: true,
                    contextmenu: true,
                    // Mobile specific tweaks
                    quickSuggestions: true,
                }}
            />
            
            {/* AI Edit Modal Overlay */}
            {showAiModal && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-start justify-center pt-10 px-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#252526] w-full max-w-md rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-[#2d2d2d]">
                            <div className="flex items-center space-x-2">
                                <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded">
                                   <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <span className="font-semibold text-xs text-gray-700 dark:text-gray-200">AI Modify Code (Modern UI)</span>
                            </div>
                            {!aiLoading && (
                                <button onClick={() => setShowAiModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        
                        {/* Body */}
                        <div className="p-3">
                            {aiError && (
                                <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded border border-red-100 dark:border-red-900/30 flex items-center space-x-2">
                                    <span>⚠️</span>
                                    <span>{aiError}</span>
                                </div>
                            )}
                            
                            {!settings.openRouterApiKey && (
                                <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-xs rounded border border-yellow-100 dark:border-yellow-900/30">
                                    Please set your API Key in Settings to use this feature.
                                </div>
                            )}
                            
                            <textarea 
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                                disabled={aiLoading}
                                placeholder={`Describe how to modify ${file.name}...\n\nExamples:\n- Apply glassmorphism to the card\n- Use a gradient background\n- Add hover animations to buttons`}
                                className={clsx(
                                    "w-full text-sm p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1e1e1e] text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500/50 outline-none resize-none placeholder:text-gray-400 transition-all",
                                    aiLoading ? "h-0 opacity-0 p-0 border-0 overflow-hidden" : "h-32"
                                )}
                                autoFocus
                            />

                            {aiLoading && (
                                <div className="w-full h-64 bg-[#1e1e1e] text-green-400 font-mono text-xs p-3 overflow-auto rounded-lg border border-gray-700 shadow-inner">
                                    <div className="flex items-center space-x-2 mb-2 border-b border-gray-700 pb-2">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span className="font-bold">AI Generating Code...</span>
                                    </div>
                                    <pre className="whitespace-pre-wrap break-all">
                                        {streamingCode || "Initializing stream..."}
                                    </pre>
                                </div>
                            )}
                            
                            <div className="flex justify-end mt-3">
                                <button
                                    onClick={handleAiSubmit}
                                    disabled={!aiPrompt.trim() || aiLoading || !settings.openRouterApiKey}
                                    className={clsx(
                                        "flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition-all",
                                        !aiPrompt.trim() || aiLoading || !settings.openRouterApiKey
                                            ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                                            : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg"
                                    )}
                                >
                                    {aiLoading ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Designing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>Generate Modern UI</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
      </div>
      
      {/* Footer Info */}
      <div className="absolute bottom-4 right-4 bg-gray-100 dark:bg-gray-700/80 backdrop-blur px-2 py-1 rounded text-[10px] text-gray-500 dark:text-gray-300 font-mono pointer-events-none z-10 border border-gray-200 dark:border-gray-600">
        {file.language.toUpperCase()} &bull; Monaco
      </div>
    </div>
  );
};

export default CodeEditor;
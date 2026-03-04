import React, { useRef, useEffect, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { File, AppSettings, Project } from '../../types';
import { X, Loader2, AlignLeft, Sparkles, Undo, Redo, Copy, Check, Maximize, ClipboardPaste, Scissors, MessageSquare, Send, Bot } from 'lucide-react';
import clsx from 'clsx';

interface CodeEditorProps {
  project?: Project;
  file: File;
  content: string;
  onChange: (value: string) => void;
  settings: AppSettings;
  openFiles?: File[];
  activeFileId?: string;
  onTabSelect?: (file: File) => void;
  onTabClose?: (id: string) => void;
  onUpdateFiles?: (files: { name: string, content: string }[]) => void;
  onRenameProject?: (newName: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ 
    project,
    file, 
    content, 
    onChange, 
    settings, 
    openFiles = [], 
    activeFileId,
    onTabSelect,
    onTabClose,
    onUpdateFiles,
    onRenameProject
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingRef = useRef<HTMLDivElement>(null);
  
  // AI Chat State
  interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [generatingFiles, setGeneratingFiles] = useState<{name: string, content: string}[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const extractGeneratingFiles = (text: string) => {
      const files: {name: string, content: string}[] = [];
      const regex = /===\s*([^=]+)\s*===\s*\n*```[a-z]*\n([\s\S]*?)(?:\n```|$)/gi;
      let match;
      while ((match = regex.exec(text)) !== null) {
          files.push({
              name: match[1].trim(),
              content: match[2]
          });
      }
      return files;
  };

  const stripCodeBlocks = (text: string) => {
      // Only strip the strict format blocks that are being applied to files
      let stripped = text.replace(/===\s*([^=]+)\s*===\s*\n*```[a-z]*\n[\s\S]*?(?:\n```|$)/gi, '');
      // Also strip PROJECT_NAME tags
      stripped = stripped.replace(/===\s*PROJECT_NAME:\s*([^=]+)\s*===/gi, '');
      return stripped.trim();
  };

  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState(false);
  
  // Selection Toolbar State
  const [toolbarPosition, setToolbarPosition] = useState<{top: number, left: number} | null>(null);

  // Clear chat memory when project changes
  useEffect(() => {
    setChatMessages([]);
    setIsChatOpen(false);
    setChatInput('');
    setStreamingMessage('');
    setChatError(null);
  }, [project?.id]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, streamingMessage, isAiTyping]);

  // Auto-Analyze on first open
  useEffect(() => {
    if (isChatOpen && chatMessages.length === 0 && project && !isAiTyping) {
        handleAutoAnalyze();
    }
  }, [isChatOpen, chatMessages.length, project]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Auto-format on load to ensure AI generated code looks good
    setTimeout(() => {
        editor.getAction('editor.action.formatDocument')?.run();
    }, 500);

    // Listen for selection changes
    editor.onDidChangeCursorSelection((e) => {
        const selection = editor.getSelection();
        if (selection && !selection.isEmpty()) {
            const position = editor.getScrolledVisiblePosition(selection.getEndPosition());
            if (position) {
                // Position above the selection
                setToolbarPosition({ top: position.top - 50, left: position.left });
            }
        } else {
            setToolbarPosition(null);
        }
    });

    // Hide toolbar on scroll
    editor.onDidScrollChange(() => {
        setToolbarPosition(null);
    });
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

  // Auto-scroll streaming code
  useEffect(() => {
    if (streamingRef.current) {
        streamingRef.current.scrollTop = streamingRef.current.scrollHeight;
    }
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

  const handleCopy = async () => {
      if (editorRef.current) {
          const value = editorRef.current.getValue();
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  const handlePaste = async () => {
      const editor = editorRef.current;
      if (!editor) return;

      // 1. Always focus the editor first so it knows where to paste
      editor.focus();

      try {
          // 2. Try modern Clipboard API first (works in secure contexts)
          if (navigator.clipboard && navigator.clipboard.readText) {
              const text = await navigator.clipboard.readText();
              const selection = editor.getSelection();
              
              if (selection && text) {
                  editor.executeEdits("clipboard", [{
                      range: selection,
                      text: text,
                      forceMoveMarkers: true
                  }]);
                  editor.pushUndoStop();
                  setPasted(true);
                  setTimeout(() => setPasted(false), 2000);
                  return;
              }
          }
          throw new Error("Clipboard API not available or empty");
      } catch (err) {
          console.warn('Modern clipboard API failed, using fallback:', err);
          
          // 3. Fallback: Try Monaco's native paste trigger
          // This often works even when readText() fails, as it hooks into the browser's native paste event if possible
          editor.trigger('source', 'editor.action.clipboardPasteAction', null);
          setPasted(true);
          setTimeout(() => setPasted(false), 2000);
      }
  };

  const handleSelectAll = () => {
      if (editorRef.current) {
          const range = editorRef.current.getModel().getFullModelRange();
          editorRef.current.setSelection(range);
          editorRef.current.focus();
      }
  };

  const systemPrompt = `## STRICT RULES ##

RULE 1 - PROJECT ANALYSIS & CODE GENERATION:
- You have the project context. Keep the full project structure and logic in your mind.
- Do NOT auto-generate code unless the user explicitly asks for code or changes.
- If the user asks a question, just answer it conversationally in a friendly, natural tone.
- When the user asks for code, generate it using the exact format below.

RULE 2 - ZERO BROKEN CODE POLICY:
- NEVER give incomplete or broken code
- Every code snippet must be 100% functional and ready to run
- Always include all imports, dependencies, and required setup
- If unsure about something, ASK before writing code

RULE 3 - FULL FILE REPLACEMENT ONLY:
- When editing code, ALWAYS return the COMPLETE updated file
- Never return partial snippets like "// rest of code remains same"
- Always write every single line of the file

RULE 4 - CHANGE TRACKING & FRIENDLY COMMUNICATION:
- Communicate in a friendly, conversational manner.
- When you generate or modify code, clearly explain in your conversational response exactly what changes you made and in which files/locations.
- Keep explanations concise and easy to understand.

RULE 5 - ERROR PREVENTION:
- Before finalizing code, mentally run it step by step
- Check for: syntax errors, missing brackets, undefined variables, import errors
- If a change in one file affects another file, update BOTH files

RULE 6 - CLARIFY BEFORE CODING:
- If the user request is unclear, ask 1-2 specific questions first
- Never assume and write wrong code

RULE 7 - LANGUAGE CONSISTENCY:
- Match the coding style, naming convention, and patterns already in the project
- Do not introduce new patterns without asking

RULE 8 - RESPONSE FORMAT:
When generating code, ALWAYS use this exact format for EACH file (even if it's just one file):
=== filename.ext ===
\`\`\`language
[complete working code]
\`\`\`

RULE 9 - PROJECT RENAMING:
If the user asks you to create a completely new project, tool, or app, and the current project name is generic (like "Untitled Project"), you MUST suggest a short, catchy name for the project by including this exact format anywhere in your response:
=== PROJECT_NAME: [Your Suggested Name] ===

Do not include the code blocks in your conversational response, they will be intercepted by the UI.
`;

  const handleAutoAnalyze = async () => {
    if (!settings.openRouterApiKey || !project) return;
    
    setIsAiTyping(true);
    setChatError(null);
    setStreamingMessage('');

    const projectContext = project.files.map(f => `--- ${f.name} ---\n${f.content}`).join('\n\n');
    const analyzePrompt = `Analyze this project named "${project.name}". Here is the code:\n\n${projectContext}\n\nPlease keep the entire project context in your mind. Reply with a very friendly, normal conversational message. Just mention the main important topics or what the project is about briefly. Do NOT give a long, detailed technical brief.`;

    const newMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: analyzePrompt }
    ];
    
    setChatMessages([{ role: 'user', content: "Analyze this project." }]);

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
                messages: newMessages,
                temperature: 0.7,
                stream: true
            })
        });
        
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
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
                            setStreamingMessage(prev => prev + delta);
                        }
                    } catch (e) {}
                }
            }
        }

        setChatMessages(prev => [...prev, { role: 'assistant', content: fullContent }]);
        setStreamingMessage('');
    } catch (err: any) {
        setChatError(err.message || "Failed to analyze project");
    } finally {
        setIsAiTyping(false);
    }
  };

  const handleChatSubmit = async (e?: React.FormEvent, overridePrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = overridePrompt || chatInput;
    if (!promptToSend.trim() || isAiTyping) return;
    if (!settings.openRouterApiKey) {
        setChatError("API Key missing in Settings");
        return;
    }

    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setIsAiTyping(true);
    setChatError(null);
    setStreamingMessage('');
    if (!overridePrompt) setChatInput('');

    // Add user message to UI
    const userMsg: ChatMessage = { role: 'user', content: promptToSend };
    setChatMessages(prev => [...prev, userMsg]);

    // Build context with last 20 messages + current file context
    const projectContext = project ? project.files.map(f => `--- ${f.name} ---\n${f.content}`).join('\n\n') : `Current File: ${file.name}\nCode:\n${content}`;
    
    // Keep last 20 messages
    const recentMessages = chatMessages.slice(-20);
    
    const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...recentMessages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: `[Current Project State]\n${projectContext}\n\nUser Request: ${promptToSend}` }
    ];

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
                messages: apiMessages,
                temperature: 0.7,
                stream: true
            }),
            signal: controller.signal
        });
        
        if (!response.ok) {
            if (response.status === 401) throw new Error("Invalid API Key.");
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
                            
                            const files = extractGeneratingFiles(fullContent);
                            if (files.length > 0) {
                                setIsGeneratingCode(true);
                                setGeneratingFiles(files);
                            }
                            
                            const textOnly = stripCodeBlocks(fullContent);
                            setStreamingMessage(textOnly);
                        }
                    } catch (e) {}
                }
            }
        }

        const finalFiles = extractGeneratingFiles(fullContent);
        let textOnly = stripCodeBlocks(fullContent);

        // Check for project renaming
        const projectNameMatch = fullContent.match(/===\s*PROJECT_NAME:\s*([^=]+)\s*===/i);
        if (projectNameMatch && onRenameProject) {
            const newName = projectNameMatch[1].trim();
            onRenameProject(newName);
            // Remove the project name tag from the visible text
            textOnly = textOnly.replace(/===\s*PROJECT_NAME:\s*([^=]+)\s*===/i, '').trim();
        }

        setChatMessages(prev => [...prev, { role: 'assistant', content: textOnly }]);
        setStreamingMessage('');
        
        // Auto-hide terminal after a short delay so user can see completion
        setTimeout(() => {
            setIsGeneratingCode(false);
            setGeneratingFiles([]);
        }, 1500);

        if (finalFiles.length > 0 && onUpdateFiles) {
            onUpdateFiles(finalFiles);
        }
        
        setTimeout(() => {
             editorRef.current?.getAction('editor.action.formatDocument')?.run();
        }, 200);

    } catch (err: any) {
        if (err.name !== 'AbortError') {
            setChatError(err.message || "Failed to generate response");
        }
    } finally {
        if (abortControllerRef.current === controller) {
            setIsAiTyping(false);
            abortControllerRef.current = null;
        }
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
                onClick={handleCopy}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
                title="Copy All Code"
               >
                 {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
               </button>
               <button 
                onClick={handlePaste}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
                title="Paste Code"
               >
                 {pasted ? <Check className="w-4 h-4 text-green-500" /> : <ClipboardPaste className="w-4 h-4" />}
               </button>
               <button 
                onClick={handleSelectAll}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
                title="Select All Code"
               >
                 <Maximize className="w-4 h-4" />
               </button>
               <button 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={clsx(
                    "p-1.5 rounded transition-colors",
                    isChatOpen ? "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400" : "hover:bg-purple-100 dark:hover:bg-purple-900/30 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
                )}
                title="AI Assistant"
               >
                 <Bot className="w-4 h-4" />
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
      <div className="flex-1 relative overflow-hidden editor-container">
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
            
            {/* Floating Selection Toolbar */}
            {toolbarPosition && (
                <div 
                    className="absolute z-50 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 flex items-center p-1 space-x-1 animate-in fade-in zoom-in duration-150"
                    style={{ 
                        top: Math.max(10, toolbarPosition.top), // Ensure it doesn't go off-screen top
                        left: Math.max(10, Math.min(toolbarPosition.left, window.innerWidth - 200)) // Keep within bounds
                    }}
                >
                    <button 
                        onClick={() => {
                            editorRef.current?.trigger('source', 'editor.action.clipboardCopyAction');
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                            setToolbarPosition(null);
                        }}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
                        title="Copy"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button 
                        onClick={() => {
                            editorRef.current?.trigger('source', 'editor.action.clipboardCutAction');
                            setToolbarPosition(null);
                        }}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
                        title="Cut"
                    >
                        <Scissors className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => {
                            editorRef.current?.trigger('source', 'editor.action.commentLine');
                            setToolbarPosition(null);
                        }}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-300"
                        title="Toggle Comment"
                    >
                        <MessageSquare className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                    <button 
                        onClick={() => {
                            const selection = editorRef.current?.getSelection();
                            const text = editorRef.current?.getModel()?.getValueInRange(selection);
                            if (text) {
                                setChatInput(`Refactor this code:\n\n${text}`);
                                setIsChatOpen(true);
                            }
                            setToolbarPosition(null);
                        }}
                        className="flex items-center space-x-1 px-2 py-1 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded text-purple-600 dark:text-purple-300 text-xs font-medium"
                    >
                        <Sparkles className="w-3 h-3" />
                        <span>AI Edit</span>
                    </button>
                </div>
            )}
            
            {/* Code Generation Terminal Popup */}
            {isGeneratingCode && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-gray-700">
                            <div className="flex items-center space-x-3">
                                <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                                <h3 className="text-gray-200 font-medium text-sm flex items-center space-x-2">
                                    <span>AI is writing code...</span>
                                    {generatingFiles.length > 0 && (
                                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-md text-xs font-mono">
                                            {generatingFiles[generatingFiles.length - 1].name}
                                        </span>
                                    )}
                                </h3>
                            </div>
                            <button 
                                onClick={() => {
                                    if (abortControllerRef.current) {
                                        abortControllerRef.current.abort();
                                        abortControllerRef.current = null;
                                    }
                                    setIsGeneratingCode(false);
                                    setIsAiTyping(false);
                                }}
                                className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 transition-colors"
                                title="Stop Generation"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 bg-[#1e1e1e]">
                            {generatingFiles.map((file, idx) => (
                                <div key={idx} className="mb-6 last:mb-0">
                                    <div className="text-xs text-gray-400 mb-2 font-mono flex items-center space-x-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        <span>{file.name}</span>
                                    </div>
                                    <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-all">
                                        <code>{file.content}</code>
                                    </pre>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            {/* AI Chat Panel */}
            <div className={clsx(
                "absolute top-0 right-0 bottom-0 w-full sm:w-80 bg-white dark:bg-[#252526] border-l border-gray-200 dark:border-gray-700 shadow-2xl z-40 flex flex-col transition-transform duration-300",
                isChatOpen ? "translate-x-0" : "translate-x-full"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2d2d2d]">
                    <div className="flex items-center space-x-2">
                        <Bot className="w-5 h-5 text-purple-500" />
                        <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">AI Assistant</span>
                    </div>
                    <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-gray-500">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Chat Messages */}
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-[#1e1e1e]">
                    {chatMessages.filter(m => m.role !== 'system').map((msg, idx) => (
                        <div key={idx} className={clsx("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                            <div className={clsx(
                                "max-w-[90%] rounded-xl p-3 text-sm",
                                msg.role === 'user' 
                                    ? "bg-purple-600 text-white rounded-tr-sm" 
                                    : "bg-white dark:bg-[#2d2d2d] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-tl-sm shadow-sm"
                            )}>
                                <div className="whitespace-pre-wrap break-words font-sans">
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {streamingMessage && (
                        <div className="flex flex-col items-start">
                            <div className="max-w-[90%] rounded-xl p-3 text-sm bg-white dark:bg-[#2d2d2d] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-tl-sm shadow-sm">
                                <div className="whitespace-pre-wrap break-words font-sans">
                                    {streamingMessage}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {isAiTyping && !streamingMessage && (
                        <div className="flex items-center space-x-2 text-gray-400 text-xs p-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>AI is thinking...</span>
                        </div>
                    )}
                    
                    {chatError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs">
                            {chatError}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#252526]">
                    <form onSubmit={handleChatSubmit} className="flex items-end space-x-2">
                        <textarea
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleChatSubmit(e);
                                }
                            }}
                            placeholder="Ask AI to analyze or code..."
                            className="flex-1 max-h-32 min-h-[40px] p-2 text-sm bg-gray-100 dark:bg-[#1e1e1e] border border-transparent focus:border-purple-500 dark:focus:border-purple-500 rounded-lg resize-none outline-none text-gray-800 dark:text-gray-200"
                            rows={1}
                        />
                        {isAiTyping ? (
                            <button 
                                type="button"
                                onClick={() => {
                                    if (abortControllerRef.current) {
                                        abortControllerRef.current.abort();
                                        abortControllerRef.current = null;
                                    }
                                    setIsAiTyping(false);
                                }}
                                className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex-shrink-0"
                                title="Stop Generation"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        ) : (
                            <button 
                                type="submit"
                                disabled={!chatInput.trim()}
                                className="p-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors flex-shrink-0"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        )}
                    </form>
                    <div className="text-[10px] text-center text-gray-400 mt-2">
                        AI reads your project and writes code directly.
                    </div>
                </div>
            </div>
      </div>
      
      {/* Footer Info */}
      <div className="absolute bottom-4 right-4 bg-gray-100 dark:bg-gray-700/80 backdrop-blur px-2 py-1 rounded text-[10px] text-gray-500 dark:text-gray-300 font-mono pointer-events-none z-10 border border-gray-200 dark:border-gray-600">
        {file.language.toUpperCase()} &bull; Monaco
      </div>
    </div>
  );
};

export default CodeEditor;
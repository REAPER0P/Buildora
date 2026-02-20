import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Settings, Trash2, Copy, Check } from 'lucide-react';
import { AppSettings, ChatMessage } from '../../types';
import clsx from 'clsx';

interface AIChatProps {
  settings: AppSettings;
  onNavigateSettings: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ settings, onNavigateSettings }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !settings.openRouterApiKey) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

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
          model: settings.openRouterModel || "google/gemini-2.0-flash-lite-preview-02-05:free",
          messages: [
             { role: "system", content: "You are an expert web developer. NEVER combine HTML, CSS, and JavaScript in one file. ALWAYS generate 3 separate files: index.html, style.css, script.js. Output format MUST be exactly like this:\n\n=== index.html ===\n(HTML code only)\n\n=== style.css ===\n(CSS code only)\n\n=== script.js ===\n(JavaScript code only)\n\nIf the user asks for a simple explanation, you can answer normally, but if you provide code for a functional page/app, use the format above." },
             ...messages.map(m => ({role: m.role, content: m.content})),
             {role: "user", content: userMessage.content}
          ],
        })
      });

      if (!response.ok) {
         if (response.status === 401) {
             throw new Error("Invalid API Key. Please check your OpenRouter API Key in Settings.");
         }
         throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const aiContent = data.choices?.[0]?.message?.content || "No response received.";

      const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiContent,
          timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
       console.error(error);
       const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "Sorry, I encountered an error communicating with the AI. Please check your API key and connection.",
          timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => setMessages([]);

  if (!settings.openRouterApiKey) {
      return (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-950 transition-colors">
              <div className="p-4 bg-teal-100 dark:bg-teal-900/30 rounded-full mb-6">
                  <Bot className="w-12 h-12 text-teal-600 dark:text-teal-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Configure AI Assistant</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm">
                  To use the AI coding assistant, please provide your OpenRouter API key in the settings.
              </p>
              <button 
                onClick={onNavigateSettings}
                className="flex items-center space-x-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium shadow-lg shadow-teal-200 dark:shadow-none transition-all"
              >
                  <Settings className="w-4 h-4" />
                  <span>Go to Settings</span>
              </button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 transition-colors">
       {/* Chat Header */}
       <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shadow-sm z-10">
            <div className="flex items-center space-x-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                    <Bot className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                    <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm">AI Assistant</h2>
                    <p className="text-[10px] text-gray-500 truncate max-w-[150px]">{settings.openRouterModel || 'Default Model'}</p>
                </div>
            </div>
            <button 
                onClick={clearChat}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Clear Chat"
            >
                <Trash2 className="w-5 h-5" />
            </button>
       </div>

       {/* Messages Area */}
       <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-50 space-y-4">
                    <Bot className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                    <div className="text-sm text-gray-500">
                        <p>Ask me anything about your code!</p>
                        <p className="text-xs mt-2">Powered by OpenRouter</p>
                    </div>
                </div>
            )}
            
            {messages.map((msg) => (
                <div key={msg.id} className={clsx(
                    "flex items-start space-x-3 max-w-3xl mx-auto",
                    msg.role === 'user' ? "flex-row-reverse space-x-reverse" : ""
                )}>
                    <div className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                        msg.role === 'user' ? "bg-blue-100 dark:bg-blue-900/50" : "bg-teal-100 dark:bg-teal-900/50"
                    )}>
                        {msg.role === 'user' ? (
                            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                            <Bot className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        )}
                    </div>

                    <div className={clsx(
                        "rounded-2xl px-4 py-3 text-sm shadow-sm relative group max-w-[85%]",
                        msg.role === 'user' 
                            ? "bg-blue-600 text-white rounded-tr-none" 
                            : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-tl-none"
                    )}>
                        <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                        {msg.role === 'assistant' && (
                            <button 
                                onClick={() => copyToClipboard(msg.content, msg.id)}
                                className="absolute -bottom-6 right-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Copy"
                            >
                                {copiedId === msg.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                        )}
                    </div>
                </div>
            ))}
            
            {isLoading && (
                 <div className="flex items-center space-x-3 max-w-3xl mx-auto">
                    <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center shrink-0">
                        <Loader2 className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-spin" />
                    </div>
                    <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                 </div>
            )}
       </div>

       {/* Input Area */}
       <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto relative flex items-center">
              <input 
                 type="text" 
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 placeholder="Type your question..."
                 className="w-full pl-4 pr-12 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 dark:text-white shadow-inner"
                 disabled={isLoading}
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors shadow-sm"
              >
                  <Send className="w-4 h-4" />
              </button>
          </form>
       </div>
    </div>
  );
};

export default AIChat;
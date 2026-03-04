import React, { useState, useRef, useEffect } from 'react';
import { AppSettings } from '../../types';
import { Moon, Sun, Type, Save, WrapText, AlertTriangle, Bot, Key, Cpu, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
  onClearData?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdate, onClearData }) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Model Selection State
  const [savedModels, setSavedModels] = useState<string[]>(() => {
    const saved = localStorage.getItem('buildora_saved_models');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      "stepfun/step-3.5-flash:free",
      "arcee-ai/trinity-large-preview:free",
      "qwen/qwen3-coder:free",
      "openai/gpt-oss-120b",
      "nvidia/nemotron-3-nano-30b-a3b:free",
      "qwen/qwen3-next-80b-a3b-instruct",
      "mistralai/mistral-7b-instruct",
      "openrouter/free:free"
    ];
  });

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    localStorage.setItem('buildora_saved_models', JSON.stringify(savedModels));
  }, [savedModels]);

  const getShortName = (modelId: string) => {
    const parts = modelId.split('/');
    const namePart = parts.length > 1 ? parts[1] : parts[0];
    const cleanName = namePart.split(':')[0].replace(/-/g, ' ').replace(/_/g, ' ');
    return cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const handleTouchStart = (model: string) => {
    longPressTimer.current = setTimeout(() => {
      setSavedModels(prev => prev.filter(m => m !== model));
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTestConnection = async () => {
    const model = settings.openRouterModel;
    const apiKey = settings.openRouterApiKey;

    if (!model || !apiKey) {
      setTestStatus('error');
      setTestMessage('API Key and Model Name are required.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Testing...');

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.href,
          "X-Title": "Buildora",
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 5
        })
      });

      if (response.ok) {
        setTestStatus('success');
        setTestMessage(`✅ openrouter — ${model} ready!`);
        
        if (!savedModels.includes(model)) {
          setSavedModels(prev => [model, ...prev]);
        }
      } else {
        setTestStatus('error');
        setTestMessage(`❌ ${model} is not a valid model or API key is incorrect.`);
      }
    } catch (err) {
      setTestStatus('error');
      setTestMessage(`❌ Failed to connect to OpenRouter.`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 sm:p-8 transition-colors">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Appearance */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-gray-100">Appearance</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  {settings.theme === 'dark' ? <Moon className="w-5 h-5 text-purple-400" /> : <Sun className="w-5 h-5 text-orange-500" />}
                </div>
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-200">App Theme</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{settings.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</div>
                </div>
              </div>
              <button 
                onClick={() => onUpdate({...settings, theme: settings.theme === 'light' ? 'dark' : 'light'})}
                className={clsx(
                  "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  settings.theme === 'dark' ? "bg-purple-600" : "bg-gray-300"
                )}
              >
                <span 
                  className={clsx(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    settings.theme === 'dark' ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Editor */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-gray-100">Editor</h3>
          </div>
          <div className="p-6 space-y-6">
            
            {/* Font Size */}
            <div className="flex items-center justify-between">
               <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <Type className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-200">Font Size</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{settings.fontSize}px</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                 <button 
                    onClick={() => onUpdate({...settings, fontSize: Math.max(10, settings.fontSize - 1)})}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center font-bold text-gray-600 dark:text-gray-200"
                 >-</button>
                 <button 
                    onClick={() => onUpdate({...settings, fontSize: Math.min(24, settings.fontSize + 1)})}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center font-bold text-gray-600 dark:text-gray-200"
                 >+</button>
              </div>
            </div>

            {/* Word Wrap */}
            <div className="flex items-center justify-between">
               <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <WrapText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-200">Word Wrap</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">Wrap long lines</div>
                </div>
              </div>
              <button 
                onClick={() => onUpdate({...settings, wordWrap: !settings.wordWrap})}
                className={clsx(
                  "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  settings.wordWrap ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"
                )}
              >
                <span 
                  className={clsx(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    settings.wordWrap ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {/* Auto Save */}
            <div className="flex items-center justify-between">
               <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <Save className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-200">Auto Save</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">Save changes automatically</div>
                </div>
              </div>
              <button 
                onClick={() => onUpdate({...settings, autoSave: !settings.autoSave})}
                className={clsx(
                  "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  settings.autoSave ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"
                )}
              >
                <span 
                  className={clsx(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    settings.autoSave ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

          </div>
        </section>

        {/* AI Configuration */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center space-x-2">
            <Bot className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-gray-800 dark:text-gray-100">AI Integration</h3>
          </div>
          <div className="p-6 space-y-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-2">
                    <Key className="w-4 h-4 text-gray-400" />
                    <span>OpenRouter API Key</span>
                </label>
                <input 
                    type="password"
                    value={settings.openRouterApiKey || ''}
                    onChange={(e) => onUpdate({...settings, openRouterApiKey: e.target.value})}
                    placeholder="sk-or-..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500">Required to use the AI chat assistant.</p>
             </div>

             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-gray-400" />
                    <span>Model Name</span>
                </label>
                <input 
                    type="text"
                    value={settings.openRouterModel || ''}
                    onChange={(e) => {
                        onUpdate({...settings, openRouterModel: e.target.value});
                        setTestStatus('idle');
                        setTestMessage('');
                    }}
                    placeholder="arcee-ai/trinity-large-preview:free"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none dark:bg-gray-700 dark:text-white"
                />
                
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {savedModels.map(model => (
                      <button
                        key={model}
                        onClick={() => {
                            onUpdate({...settings, openRouterModel: model});
                            setTestStatus('idle');
                            setTestMessage('');
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSavedModels(prev => prev.filter(m => m !== model));
                        }}
                        onTouchStart={() => handleTouchStart(model)}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                        className={clsx(
                          "px-3 py-1.5 rounded-full text-xs font-medium border flex items-center space-x-1 transition-colors select-none",
                          settings.openRouterModel === model 
                            ? "bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400" 
                            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        <span>{getShortName(model)}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">Long press or right-click a model to remove it.</p>
                </div>

                {/* Test Connection Button */}
                <div className="mt-4">
                    <button
                        onClick={handleTestConnection}
                        disabled={testStatus === 'testing' || !settings.openRouterModel || !settings.openRouterApiKey}
                        className={clsx(
                            "w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-all",
                            testStatus === 'testing' ? "bg-blue-600 text-white" :
                            testStatus === 'success' ? "bg-green-600 text-white hover:bg-green-700" :
                            testStatus === 'error' ? "bg-red-600 text-white hover:bg-red-700" :
                            "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500"
                        )}
                    >
                        {testStatus === 'testing' ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Testing...</span>
                            </>
                        ) : testStatus === 'success' ? (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Connected!</span>
                            </>
                        ) : testStatus === 'error' ? (
                            <>
                                <XCircle className="w-4 h-4" />
                                <span>Failed — Retry</span>
                            </>
                        ) : (
                            <span>Test Connection</span>
                        )}
                    </button>
                    
                    {/* Status Message */}
                    {testMessage && (
                        <div className={clsx(
                            "mt-2 p-3 rounded-lg text-xs font-mono break-all",
                            testStatus === 'success' ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30" :
                            testStatus === 'error' ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30" :
                            "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                        )}>
                            {testMessage}
                        </div>
                    )}
                </div>
             </div>
          </div>
        </section>
        
        {/* Data Management */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-100 dark:border-red-900/30 overflow-hidden transition-all">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-red-600 dark:text-red-400">Danger Zone</h3>
          </div>
          <div className="p-6">
            {!showClearConfirm ? (
                <div className="flex items-center justify-between">
                <div>
                    <div className="font-medium text-gray-800 dark:text-gray-200">Clear All Data</div>
                    <div className="text-xs text-gray-500">Delete all projects and settings</div>
                </div>
                <button 
                    onClick={() => setShowClearConfirm(true)}
                    className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-sm font-medium transition-colors"
                >
                    Clear
                </button>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                        Are you sure? This will permanently delete all your projects and reset your settings.
                    </p>
                    <div className="flex space-x-3">
                        <button 
                            onClick={() => setShowClearConfirm(false)}
                            className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => {
                                if (onClearData) onClearData();
                                setShowClearConfirm(false);
                            }}
                            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium shadow-md shadow-red-200 dark:shadow-none"
                        >
                            Confirm Delete
                        </button>
                    </div>
                </div>
            )}
          </div>
        </section>

        <div className="text-center text-xs text-gray-400 pt-4 pb-20">
          Buildora v1.1.0 &bull; Mobile First Web IDE
        </div>

      </div>
    </div>
  );
};

export default SettingsView;
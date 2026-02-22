import React, { useState } from 'react';
import { AppSettings } from '../../types';
import { Moon, Sun, Type, Save, WrapText, Trash, AlertTriangle, Bot, Key, Cpu } from 'lucide-react';
import clsx from 'clsx';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
  onClearData?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdate, onClearData }) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
                    onChange={(e) => onUpdate({...settings, openRouterModel: e.target.value})}
                    placeholder="google/gemini-2.0-flash-lite-preview-02-05:free"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500">Enter any OpenRouter model ID (e.g. arcee-ai/trinity-large-preview:free, stepfun/step-3.5-flash:free, mistralai/mistral-7b-instruct:free, openrouter/free).</p>
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

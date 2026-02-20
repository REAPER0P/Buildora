import React, { useState, useEffect, useRef } from 'react';
import { Project, File, ViewMode, AppSettings, ConsoleMessage } from './types';
import { getProjects, saveProject, deleteProject, createProject, duplicateProject } from './utils/storage';
import BottomNav from './components/Layout/BottomNav';
import ProjectList from './components/Dashboard/ProjectList';
import CodeEditor from './components/Editor/CodeEditor';
import FileExplorer from './components/Editor/FileExplorer';
import LivePreview from './components/Preview/LivePreview';
import ApkBuilder from './components/Export/ApkBuilder';
import SettingsView from './components/Settings/SettingsView';
import ConsolePanel from './components/Layout/ConsolePanel';
import AIChat from './components/AI/AIChat';
import { Menu, Play, Settings as SettingsIcon, FolderOpen, ChevronLeft, FilePlus, Upload, Terminal, Square } from 'lucide-react';
import clsx from 'clsx';
import JSZip from 'jszip';

const App: React.FC = () => {
  // State
  const [view, setView] = useState<ViewMode>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  
  // Editor State
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [openFiles, setOpenFiles] = useState<File[]>([]); // Tab system
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  
  // Console State
  const [showConsole, setShowConsole] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleMessage[]>([]);
  const [isServerRunning, setIsServerRunning] = useState(false);

  const [settings, setSettings] = useState<AppSettings>({
    theme: 'light',
    fontSize: 14,
    autoSave: true,
    wordWrap: false,
    openRouterModel: 'stepfun/step-3.5-flash:free', // Default as per requirements
  });

  const importInputRef = useRef<HTMLInputElement>(null);

  // Load projects on mount
  useEffect(() => {
    const loadedProjects = getProjects();
    setProjects(loadedProjects);
    
    // Load settings from local storage
    const savedSettings = localStorage.getItem('buildora_settings');
    if (savedSettings) {
        try {
            setSettings(prev => ({...prev, ...JSON.parse(savedSettings)}));
        } catch(e) { console.error("Failed to load settings", e); }
    }
  }, []);

  // Save settings on change
  useEffect(() => {
    localStorage.setItem('buildora_settings', JSON.stringify(settings));
  }, [settings]);

  // Theme Effect
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Auto-save effect
  useEffect(() => {
    if (activeProject && settings.autoSave) {
      const timer = setTimeout(() => {
        saveProject(activeProject);
        setProjects(prev => prev.map(p => p.id === activeProject.id ? activeProject : p));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [activeProject, settings.autoSave]);

  // --- Console Handlers ---
  const addConsoleLog = (type: ConsoleMessage['type'], message: string) => {
    setConsoleLogs(prev => [...prev, {
        id: Date.now().toString() + Math.random(),
        type,
        message,
        timestamp: Date.now()
    }]);
  };

  const clearConsole = () => setConsoleLogs([]);

  // --- Project Handlers ---
  const handleCreateProject = (name: string, type: 'html' | 'php') => {
    const newProject = createProject(name, type);
    setProjects(prev => [newProject, ...prev]);
    setActiveProject(newProject);
    const indexFile = newProject.files.find(f => f.name.startsWith('index'));
    if (indexFile) {
        setOpenFiles([indexFile]);
        setActiveFile(indexFile);
    }
    setView('editor');
    addConsoleLog('system', `Project "${name}" created.`);
  };

  const handleAIProjectCreated = (newProject: Project) => {
    setProjects(prev => [newProject, ...prev]);
    saveProject(newProject);
    addConsoleLog('system', `AI Project "${newProject.name}" generated.`);
    
    // Open the new project
    setActiveProject(newProject);
    const indexFile = newProject.files.find(f => f.name === 'index.html');
    if (indexFile) {
        setOpenFiles([indexFile]);
        setActiveFile(indexFile);
    }
    setView('editor');
  };

  const handleDeleteProject = (id: string) => {
    deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeProject?.id === id) {
      setActiveProject(null);
      setActiveFile(null);
      setOpenFiles([]);
      setView('dashboard');
    }
  };

  const handleDuplicateProject = (id: string) => {
    const newProject = duplicateProject(id);
    if (newProject) {
      setProjects(prev => [newProject, ...prev]);
      addConsoleLog('system', `Project duplicated: ${newProject.name}`);
    }
  };

  const handleOpenProject = (project: Project) => {
    setActiveProject(project);
    // Restore previously open files or just open index
    const indexFile = project.files.find(f => f.name.startsWith('index'));
    if (indexFile) {
        setOpenFiles([indexFile]);
        setActiveFile(indexFile);
    } else {
        setOpenFiles([]);
        setActiveFile(null);
    }
    setConsoleLogs([]);
    setIsServerRunning(false); // Reset server state on new project
    setView('editor');
  };

  const handleBuildProject = (project: Project) => {
    setActiveProject(project);
    // Reset files if needed, but keeping them closed is fine for build view
    setOpenFiles([]);
    setActiveFile(null);
    setView('export');
  };

  // --- File Handlers ---
  const handleUpdateFileContent = (content: string) => {
    if (activeProject && activeFile) {
      const updatedFiles = activeProject.files.map(f => 
        f.id === activeFile.id ? { ...f, content } : f
      );
      
      // Update Active Project
      const updatedProject = { ...activeProject, files: updatedFiles, lastModified: Date.now() };
      setActiveProject(updatedProject);
      
      // Update Active File Ref
      const updatedFile = { ...activeFile, content };
      setActiveFile(updatedFile);

      // Update Open Files Tab State
      setOpenFiles(prev => prev.map(f => f.id === activeFile.id ? updatedFile : f));
    }
  };

  const handleAddFile = (name: string, content: string = '', parentId: string = 'root', isDir: boolean = false) => {
    if (activeProject) {
      // Determine language/type
      let lang: any = 'html';
      const ext = name.split('.').pop()?.toLowerCase();
      if (ext === 'css') lang = 'css';
      else if (ext === 'js') lang = 'javascript';
      else if (ext === 'php') lang = 'php';
      else if (ext === 'json') lang = 'json';
      else if (['png','jpg','jpeg','gif','webp','svg'].includes(ext || '')) lang = 'image';
      else if (['ttf','otf','woff','woff2'].includes(ext || '')) lang = 'font';

      const newFile: File = {
        id: Date.now().toString(),
        name,
        content,
        language: lang,
        parentId,
        isDirectory: isDir
      };
      
      const updatedProject = {
        ...activeProject,
        files: [...activeProject.files, newFile]
      };
      
      setActiveProject(updatedProject);
      saveProject(updatedProject);
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));

      if (!isDir) {
          if (lang !== 'image' && lang !== 'font') {
             setOpenFiles(prev => [...prev, newFile]);
             setActiveFile(newFile);
          }
          addConsoleLog('system', `File created: ${name}`);
      } else {
          addConsoleLog('system', `Folder created: ${name}`);
      }
    }
  };

  const handleDeleteFile = (fileId: string) => {
    if (activeProject) {
      // If folder, delete children (basic implementation)
      // Real implementation would be recursive, here we filter simply
      const fileToDelete = activeProject.files.find(f => f.id === fileId);
      
      let updatedFiles = activeProject.files.filter(f => f.id !== fileId);
      
      // Remove children if directory
      if (fileToDelete?.isDirectory) {
          updatedFiles = updatedFiles.filter(f => f.parentId !== fileId);
      }

      const updatedProject = { ...activeProject, files: updatedFiles };
      setActiveProject(updatedProject);
      
      // Close tab if open
      if (openFiles.find(f => f.id === fileId)) {
         handleCloseTab(fileId);
      }
      
      saveProject(updatedProject);
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
      addConsoleLog('system', `Deleted: ${fileToDelete?.name}`);
    }
  };

  const handleRenameFile = (fileId: string, newName: string) => {
    if (activeProject) {
      const updatedFiles = activeProject.files.map(f => 
        f.id === fileId ? { ...f, name: newName } : f
      );
      const updatedProject = { ...activeProject, files: updatedFiles };
      setActiveProject(updatedProject);
      
      // Update active file if it was renamed
      if (activeFile?.id === fileId) {
        setActiveFile(updatedFiles.find(f => f.id === fileId) || null);
      }
      // Update tabs
      setOpenFiles(prev => prev.map(f => f.id === fileId ? { ...f, name: newName } : f));
      
      saveProject(updatedProject);
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    }
  };

  // --- Tab Handlers ---
  const handleSelectFile = (file: File) => {
      if (file.isDirectory) return; // Can't open folders in editor
      if (file.language === 'image' || file.language === 'font') {
          addConsoleLog('info', `Cannot edit binary file: ${file.name}`);
          return;
      }
      
      if (!openFiles.find(f => f.id === file.id)) {
          setOpenFiles(prev => [...prev, file]);
      }
      setActiveFile(file);
      setShowFileExplorer(false);
  };

  const handleCloseTab = (fileId: string) => {
      const newTabs = openFiles.filter(f => f.id !== fileId);
      setOpenFiles(newTabs);
      
      if (activeFile?.id === fileId) {
          setActiveFile(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null);
      }
  };

  const handleClearData = () => {
    localStorage.clear();
    setProjects([]);
    setActiveProject(null);
    setActiveFile(null);
    setOpenFiles([]);
    setSettings({
      theme: 'light',
      fontSize: 14,
      autoSave: true,
      wordWrap: false,
    });
    setView('dashboard');
  };

  const handleImportProjectClick = () => {
    importInputRef.current?.click();
  };

  const handleImportProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        if (file.name.endsWith('.zip')) {
            const zip = await JSZip.loadAsync(file);
            const files: File[] = [];
            let hasHtml = false;
            let hasPhp = false;

            const entries = Object.keys(zip.files);
            
            for (const filename of entries) {
                const entry = zip.files[filename];
                if (entry.dir || filename.startsWith('__') || filename.includes('/.')) continue;
                
                const cleanName = filename.split('/').pop() || filename;
                const ext = cleanName.split('.').pop()?.toLowerCase();
                
                let lang: any = 'html';
                let content = '';

                // Detect type and read content
                const isImage = ['png','jpg','jpeg','gif','webp','svg'].includes(ext || '');
                const isFont = ['ttf','otf','woff','woff2'].includes(ext || '');

                if (isImage || isFont) {
                    lang = isImage ? 'image' : 'font';
                    const base64 = await entry.async('base64');
                    // Guess mime
                    let mime = 'application/octet-stream';
                    if(ext === 'png') mime = 'image/png';
                    if(ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
                    if(ext === 'svg') mime = 'image/svg+xml';
                    content = `data:${mime};base64,${base64}`;
                } else {
                    content = await entry.async('string');
                    if (ext === 'css') lang = 'css';
                    else if (ext === 'js') lang = 'javascript';
                    else if (ext === 'php') lang = 'php';
                    else if (ext === 'json') lang = 'json';
                }
                
                if (cleanName.endsWith('.html')) hasHtml = true;
                if (cleanName.endsWith('.php')) hasPhp = true;

                files.push({
                    id: Date.now().toString() + Math.random().toString().slice(2),
                    name: cleanName,
                    content,
                    language: lang,
                    parentId: 'root', // Simplifying folder structure flat for now or infer
                    isDirectory: false
                });
            }

            if (files.length > 0) {
                const newProject: Project = {
                    id: Date.now().toString(),
                    name: file.name.replace('.zip', ''),
                    type: hasPhp ? 'php' : 'html',
                    lastModified: Date.now(),
                    files
                };
                setProjects(prev => [newProject, ...prev]);
                saveProject(newProject);
                addConsoleLog('system', `Imported project: ${newProject.name}`);
            }
        } else if (file.name.endsWith('.json')) {
              const text = await file.text();
              const imported = JSON.parse(text);
              if (imported.files && Array.isArray(imported.files)) {
                  const newProject = { 
                      ...imported, 
                      id: Date.now().toString(),
                      name: imported.name || file.name.replace('.json', ''),
                      lastModified: Date.now() 
                  };
                  setProjects(prev => [newProject, ...prev]);
                  saveProject(newProject);
                  addConsoleLog('system', `Imported project: ${newProject.name}`);
              } else {
                  alert('Invalid project JSON');
              }
        }
    } catch (error) {
        console.error(error);
        alert('Failed to import project.');
    }
    
    if (importInputRef.current) importInputRef.current.value = '';
  };

  const renderHeader = () => {
    const headerClass = "bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10 transition-colors";
    const textClass = "text-gray-800 dark:text-gray-100";
    const iconClass = "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700";

    if (view === 'dashboard') {
      return (
        <header className={headerClass}>
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className={`text-xl font-bold tracking-tight ${textClass}`}>Buildora</h1>
          </div>
          <div className="flex items-center space-x-1">
             <button 
               onClick={handleImportProjectClick}
               className={`p-2 rounded-full transition-colors ${iconClass}`}
               title="Import Project (ZIP/JSON)"
             >
               <Upload className="w-6 h-6" />
             </button>
             <button 
               onClick={() => setView('settings')}
               className={`p-2 rounded-full transition-colors ${iconClass}`}
             >
               <SettingsIcon className="w-6 h-6" />
             </button>
          </div>
        </header>
      );
    }

    if (view === 'editor') {
      return (
        <header className={`${headerClass} py-2 h-14`}>
          <div className="flex items-center space-x-3 overflow-hidden">
             <button 
              onClick={() => setView('dashboard')}
              className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setShowFileExplorer(!showFileExplorer)}
              className={`p-2 rounded-lg transition-colors ${iconClass}`}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col overflow-hidden">
               <span className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{activeProject?.name}</span>
               <span className={`text-sm font-bold truncate ${textClass}`}>{activeFile?.name || 'No File Selected'}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
             <button 
               onClick={() => setShowConsole(!showConsole)}
               className={clsx(`p-2 rounded-lg transition-colors mr-1`, showConsole ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300" : iconClass)}
               title="Toggle Console"
             >
               <Terminal className="w-5 h-5" />
             </button>
             <button 
              onClick={() => {
                  setView('preview');
                  setIsServerRunning(true);
                  addConsoleLog('system', 'Starting local server simulation...');
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
              <span className="text-xs font-bold uppercase tracking-wider">Run</span>
            </button>
          </div>
        </header>
      );
    }

    return (
      <header className={`${headerClass} justify-start`}>
        <button 
          onClick={() => setView(activeProject ? 'editor' : 'dashboard')}
          className="mr-3 p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
        >
           <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className={`text-lg font-bold capitalize ${textClass}`}>
            {view === 'export' ? 'APK Build Studio' : view === 'ai' ? 'AI Assistant' : view}
        </h1>
      </header>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      {renderHeader()}
      
      {/* Hidden File Input for Import */}
      <input 
        type="file" 
        ref={importInputRef} 
        onChange={handleImportProject} 
        accept=".zip,.json" 
        className="hidden" 
      />

      <main className="flex-1 overflow-hidden relative flex">
        <div className="flex-1 flex flex-col relative overflow-hidden">
          
          {view === 'dashboard' && (
            <ProjectList 
              projects={projects} 
              settings={settings}
              onCreate={handleCreateProject}
              onOpen={handleOpenProject}
              onBuild={handleBuildProject}
              onDelete={handleDeleteProject}
              onDuplicate={handleDuplicateProject}
              onAIProjectCreated={handleAIProjectCreated}
            />
          )}

          {view === 'editor' && activeProject && (
            <div className="flex-1 flex flex-col h-full relative">
               {activeFile ? (
                 <CodeEditor 
                   file={activeFile} 
                   content={activeFile.content} 
                   onChange={handleUpdateFileContent}
                   settings={settings}
                   openFiles={openFiles}
                   activeFileId={activeFile.id}
                   onTabSelect={setActiveFile}
                   onTabClose={handleCloseTab}
                 />
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-white dark:bg-[#282c34] transition-colors">
                    <FilePlus className="w-12 h-12 mb-2 opacity-50" />
                    <p>No file selected</p>
                    <button 
                      onClick={() => setShowFileExplorer(true)} 
                      className="mt-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40"
                    >
                      Open File Explorer
                    </button>
                 </div>
               )}
               
               {/* Console Panel (Sliding Up) */}
               {showConsole && (
                   <ConsolePanel 
                     logs={consoleLogs} 
                     onClose={() => setShowConsole(false)} 
                     onClear={clearConsole}
                   />
               )}
               
               {/* File Explorer Overlay */}
               {showFileExplorer && (
                 <div className="absolute inset-0 z-20 flex">
                   <div className="w-72 bg-white dark:bg-gray-800 shadow-2xl h-full border-r border-gray-200 dark:border-gray-700 flex flex-col transition-colors">
                      <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">Files</span>
                        <button onClick={() => setShowFileExplorer(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      </div>
                      <FileExplorer 
                        files={activeProject.files}
                        activeFileId={activeFile?.id || ''}
                        onSelectFile={handleSelectFile}
                        onAddFile={handleAddFile}
                        onDeleteFile={handleDeleteFile}
                        onRenameFile={handleRenameFile}
                      />
                   </div>
                   <div 
                     className="flex-1 bg-black/20 backdrop-blur-sm"
                     onClick={() => setShowFileExplorer(false)}
                   ></div>
                 </div>
               )}
            </div>
          )}

          {view === 'preview' && activeProject && (
            <LivePreview 
                project={activeProject} 
                onConsoleLog={addConsoleLog}
            />
          )}

          {view === 'export' && activeProject && (
            <ApkBuilder project={activeProject} />
          )}

          {view === 'ai' && (
             <AIChat 
                settings={settings}
                onNavigateSettings={() => setView('settings')}
             />
          )}
          
          {view === 'settings' && (
            <SettingsView 
              settings={settings} 
              onUpdate={setSettings} 
              onClearData={handleClearData}
            />
          )}

        </div>
      </main>

      {activeProject && view !== 'dashboard' && (
        <BottomNav 
          currentView={view} 
          setView={setView} 
        />
      )}
    </div>
  );
};

export default App;
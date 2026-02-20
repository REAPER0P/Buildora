import React, { useState, useRef } from 'react';
import { File } from '../../types';
import { FileCode, FileJson, FileType, Trash2, Plus, Folder, FolderPlus, Edit2, Check, Upload, AlertCircle, ChevronRight, ChevronDown, Image as ImageIcon, Type } from 'lucide-react';
import clsx from 'clsx';

interface FileExplorerProps {
  files: File[];
  activeFileId: string;
  onSelectFile: (file: File) => void;
  onAddFile: (name: string, content?: string, parentId?: string, isDir?: boolean) => void;
  onDeleteFile: (id: string) => void;
  onRenameFile: (id: string, name: string) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ files, activeFileId, onSelectFile, onAddFile, onDeleteFile, onRenameFile }) => {
  const [newItemName, setNewItemName] = useState('');
  const [addingType, setAddingType] = useState<'file' | 'folder' | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string>('root');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [fileToDelete, setFileToDelete] = useState<File | null>(null);
  
  // Expanded folders state
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({'root': true});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleFolder = (folderId: string) => {
      setExpandedFolders(prev => ({...prev, [folderId]: !prev[folderId]}));
  };

  const getFileIcon = (file: File) => {
    if (file.isDirectory) return <Folder className="w-4 h-4 text-blue-400 fill-blue-100" />;
    
    // Code
    if (file.name.endsWith('.html')) return <FileCode className="w-4 h-4 text-orange-500" />;
    if (file.name.endsWith('.css')) return <FileCode className="w-4 h-4 text-blue-500" />;
    if (file.name.endsWith('.js')) return <FileCode className="w-4 h-4 text-yellow-500" />;
    if (file.name.endsWith('.php')) return <FileCode className="w-4 h-4 text-purple-500" />;
    
    // Assets
    if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].some(ext => file.name.toLowerCase().endsWith(ext))) return <ImageIcon className="w-4 h-4 text-pink-500" />;
    if (['.ttf', '.otf', '.woff', '.woff2'].some(ext => file.name.toLowerCase().endsWith(ext))) return <Type className="w-4 h-4 text-gray-600" />;
    
    return <FileType className="w-4 h-4 text-gray-400" />;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim() && addingType) {
      onAddFile(newItemName.trim(), '', activeFolderId, addingType === 'folder');
      setNewItemName('');
      setAddingType(null);
      // Ensure folder is open
      setExpandedFolders(prev => ({...prev, [activeFolderId]: true}));
    }
  };

  const startRename = (e: React.MouseEvent, file: File) => {
    e.stopPropagation();
    setEditingId(file.id);
    setEditName(file.name);
  };

  const submitRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && editName.trim()) {
      onRenameFile(editingId, editName.trim());
      setEditingId(null);
    }
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleImportFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const total = fileList.length;
    let processed = 0;

    for (let i = 0; i < total; i++) {
        const file = fileList[i];
        const fileName = file.name;
        
        // Determine how to read based on type
        const isImage = file.type.startsWith('image/');
        const isFont = fileName.endsWith('.ttf') || fileName.endsWith('.woff') || fileName.endsWith('.otf');
        
        try {
            let content = '';
            if (isImage || isFont) {
                // Read as Data URL for binary assets
                content = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => resolve(ev.target?.result as string);
                    reader.readAsDataURL(file);
                });
            } else {
                // Read as Text for code
                content = await file.text();
            }
            
            onAddFile(fileName, content, activeFolderId, false);
        } catch (err) {
            console.error(`Failed to load ${fileName}`, err);
        }

        processed++;
        setUploadProgress(Math.round((processed / total) * 100));
    }

    setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        // Ensure folder is open
        setExpandedFolders(prev => ({...prev, [activeFolderId]: true}));
    }, 500);

    e.target.value = ''; // Reset input
  };

  // Recursive Tree Renderer
  const renderTree = (parentId: string, depth: number = 0) => {
      const items = files.filter(f => f.parentId === parentId);
      
      // Sort: Folders first, then files
      items.sort((a, b) => {
          if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
          return a.isDirectory ? -1 : 1;
      });

      return items.map(file => (
          <div key={file.id}>
             {editingId === file.id ? (
               <form onSubmit={submitRename} className="flex items-center px-2 py-1 space-x-2 bg-gray-50 dark:bg-gray-700/50" style={{ paddingLeft: `${depth * 12 + 8}px` }}>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 min-w-0 px-2 py-1 text-xs border border-blue-400 rounded bg-white dark:bg-gray-700 dark:text-white focus:outline-none"
                    autoFocus
                    onBlur={() => setEditingId(null)}
                    onClick={(e) => e.stopPropagation()}
                  />
               </form>
             ) : (
                <div 
                    className={clsx(
                        "group flex items-center justify-between py-1.5 pr-2 rounded-sm cursor-pointer text-sm transition-colors select-none",
                        file.id === activeFileId 
                            ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" 
                            : "hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300",
                        activeFolderId === file.id && file.isDirectory && "bg-gray-50 dark:bg-gray-700/30"
                    )}
                    style={{ paddingLeft: `${depth * 12 + 4}px` }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (file.isDirectory) {
                            toggleFolder(file.id);
                            setActiveFolderId(file.id);
                        } else {
                            onSelectFile(file);
                        }
                    }}
                >
                    <div className="flex items-center space-x-1.5 min-w-0 overflow-hidden">
                        {file.isDirectory && (
                            <div className="text-gray-400">
                                {expandedFolders[file.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </div>
                        )}
                        {!file.isDirectory && <span className="w-3" />}
                        {getFileIcon(file)}
                        <span className="truncate text-xs">{file.name}</span>
                    </div>

                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => startRename(e, file)}
                          className="p-1 text-gray-400 hover:text-blue-500 rounded hover:bg-white dark:hover:bg-gray-600"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setFileToDelete(file);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-white dark:hover:bg-gray-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>
             )}
             
             {/* Children */}
             {file.isDirectory && expandedFolders[file.id] && (
                 <div>{renderTree(file.id, depth + 1)}</div>
             )}
          </div>
      ));
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 overflow-y-auto transition-colors relative">
      <div className="p-2 space-y-0.5">
        {/* Project Root */}
        <div 
            className={clsx(
                "flex items-center space-x-2 px-2 py-1.5 text-gray-600 dark:text-gray-300 font-bold text-xs cursor-pointer rounded hover:bg-gray-50 dark:hover:bg-gray-700/50",
                activeFolderId === 'root' && "bg-blue-50 dark:bg-blue-900/20"
            )}
            onClick={() => setActiveFolderId('root')}
        >
           <Folder className="w-4 h-4 fill-yellow-100 text-yellow-500" />
           <span>Root /</span>
        </div>
        
        {renderTree('root')}
      </div>

      {/* Upload Progress Overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-white/90 dark:bg-gray-800/90 z-20 flex flex-col items-center justify-center p-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{width: `${uploadProgress}%`}}></div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">Importing Files {uploadProgress}%</p>
        </div>
      )}

      {addingType ? (
        <form onSubmit={handleCreateSubmit} className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <div className="text-xs text-gray-500 mb-1 flex justify-between">
              <span>New {addingType === 'folder' ? 'Folder' : 'File'} in:</span>
              <span className="font-mono text-blue-500 truncate max-w-[100px]">{activeFolderId === 'root' ? '/' : '...'}</span>
          </div>
          <div className="flex space-x-2">
            <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={addingType === 'folder' ? "images" : "style.css"}
                className="flex-1 px-3 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                autoFocus
                onBlur={() => !newItemName && setAddingType(null)}
            />
            <button type="button" onClick={() => setAddingType(null)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded"><Trash2 className="w-4 h-4" /></button>
          </div>
        </form>
      ) : (
        <div className="p-2 mt-auto border-t border-gray-100 dark:border-gray-700 grid grid-cols-5 gap-1">
           <button 
             onClick={() => setAddingType('file')}
             className="col-span-2 flex flex-col items-center justify-center py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-[10px] font-medium transition-colors"
           >
             <Plus className="w-4 h-4 mb-0.5" />
             File
           </button>
           <button 
             onClick={() => setAddingType('folder')}
             className="col-span-2 flex flex-col items-center justify-center py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-[10px] font-medium transition-colors"
           >
             <FolderPlus className="w-4 h-4 mb-0.5" />
             Folder
           </button>
           <button 
             onClick={triggerImport}
             className="col-span-1 flex flex-col items-center justify-center py-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded transition-colors"
             title="Import Files"
           >
             <Upload className="w-4 h-4" />
           </button>
           <input 
             type="file" 
             ref={fileInputRef}
             className="hidden"
             onChange={handleImportFiles}
             accept=".html,.css,.js,.php,.json,.xml,.txt,.png,.jpg,.jpeg,.gif,.svg,.webp,.ttf,.otf,.woff"
             multiple
           />
        </div>
      )}

      {/* Delete Modal Overlay */}
      {fileToDelete && (
         <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[1px]">
           <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full p-4 border border-gray-200 dark:border-gray-600">
             <div className="flex items-center space-x-2 text-red-600 mb-2">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-gray-800 dark:text-white">Delete?</h3>
             </div>
             <p className="text-gray-600 dark:text-gray-300 text-xs mb-4">
               {fileToDelete.isDirectory ? "Delete folder and all contents?" : `Delete ${fileToDelete.name}?`}
             </p>
             <div className="flex space-x-2">
               <button 
                 onClick={() => setFileToDelete(null)}
                 className="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded text-xs"
               >
                 Cancel
               </button>
               <button 
                 onClick={() => { onDeleteFile(fileToDelete.id); setFileToDelete(null); }}
                 className="flex-1 py-1.5 bg-red-600 text-white rounded text-xs"
               >
                 Delete
               </button>
             </div>
           </div>
         </div>
      )}
    </div>
  );
};

export default FileExplorer;
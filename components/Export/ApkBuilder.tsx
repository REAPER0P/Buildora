import React, { useState } from 'react';
import { Project } from '../../types';
import { Archive, CheckCircle, AlertCircle, Loader2, Download, Folder, FileText, Layers, FileCode } from 'lucide-react';
import clsx from 'clsx';
import JSZip from 'jszip';

interface ApkBuilderProps {
  project: Project;
}

const ApkBuilder: React.FC<ApkBuilderProps> = ({ project }) => {
  const [isZipping, setIsZipping] = useState(false);
  const [isSingleFile, setIsSingleFile] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const exportProject = async () => {
    setIsZipping(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      if (!project) throw new Error("No project detected");

      const zip = new JSZip();
      
      // Requirement 3: The root inside ZIP must be a folder named exactly same as the project name.
      const safeProjectName = project.name.replace(/[^a-zA-Z0-9-_\s]/g, '').trim() || "Project";
      const rootFolder = zip.folder(safeProjectName);
      
      if (!rootFolder) throw new Error("Could not create root folder");

      if (isSingleFile) {
          // --- SINGLE HTML FILE MODE ---
          
          // 1. Check for index.html
          const indexFile = project.files.find(f => f.name === 'index.html');
          if (!indexFile) throw new Error("Project must contain 'index.html' for Single File conversion.");

          let finalHtml = indexFile.content;

          // 2. Check and Merge CSS
          // Requirement: Read style.css, Inject in head, Remove link
          const cssFile = project.files.find(f => f.name === 'style.css');
          if (cssFile) {
              const cssBlock = `<style>\n/* Injected from style.css */\n${cssFile.content}\n</style>`;
              
              // Inject
              if (finalHtml.includes('</head>')) {
                  finalHtml = finalHtml.replace('</head>', `${cssBlock}\n</head>`);
              } else if (finalHtml.includes('<body')) {
                  finalHtml = finalHtml.replace(/<body/i, `${cssBlock}\n<body`);
              } else {
                  finalHtml = `${cssBlock}\n${finalHtml}`;
              }

              // Remove external link reference
              // Matches <link ... href="...style.css" ...>
              finalHtml = finalHtml.replace(/<link\s+[^>]*href=["'](.*?\/)?style\.css["'][^>]*>/gi, '');
          }

          // 3. Check and Merge JS
          // Requirement: Read script.js, Inject before body end, Remove script tag
          // Fallback to main.js if script.js not found, as main.js is default in this app
          const jsFile = project.files.find(f => f.name === 'script.js') || project.files.find(f => f.name === 'main.js');
          if (jsFile) {
              const jsBlock = `<script>\n/* Injected from ${jsFile.name} */\n${jsFile.content}\n</script>`;
              
              // Inject
              if (finalHtml.includes('</body>')) {
                  finalHtml = finalHtml.replace('</body>', `${jsBlock}\n</body>`);
              } else {
                  finalHtml = `${finalHtml}\n${jsBlock}`;
              }

              // Remove external script reference
              const jsNameRegex = jsFile.name.replace('.', '\\.');
              const scriptTagRegex = new RegExp(`<script\\s+[^>]*src=["'](.*?\\/)?${jsNameRegex}["'][^>]*>\\s*<\\/script>`, 'gi');
              finalHtml = finalHtml.replace(scriptTagRegex, '');
          }

          // 4. Export only the combined index.html
          rootFolder.file("index.html", finalHtml);

      } else {
          // --- STANDARD RECURSIVE ZIP MODE ---
          
          // Requirement 1C & 7: Recursive traversal function
          const processFolder = (parentId: string, currentZipFolder: JSZip) => {
            const items = project.files.filter(f => f.parentId === parentId);
            
            items.forEach(item => {
               if (item.isDirectory) {
                   // Requirement 1F: Include nested folders
                   const newZipFolder = currentZipFolder.folder(item.name);
                   if (newZipFolder) {
                       processFolder(item.id, newZipFolder);
                   }
               } else {
                   // Requirement 1E: Include HTML, CSS, JS, images, etc.
                   let content: string | Blob = item.content;
                   const isBinary = item.language === 'image' || item.language === 'font';
                   
                   if (isBinary && typeof content === 'string' && content.startsWith('data:')) {
                       // Handle Data URIs
                       const parts = content.split(',');
                       if (parts.length > 1) {
                           const base64Data = parts[1];
                           currentZipFolder.file(item.name, base64Data, { base64: true });
                       }
                   } else {
                       // Text content
                       currentZipFolder.file(item.name, content);
                   }
               }
            });
          };

          // Start processing from the project root
          processFolder('root', rootFolder);
      }

      // Requirement 2: Create a ZIP file named ProjectName.zip
      // Requirement 9: Background processing (async)
      const blob = await zip.generateAsync({ 
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 6 } 
      });
      
      // Requirement 4: Save ZIP file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeProjectName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Requirement 6: Success message
      setSuccessMsg(`Export Successful!`);
    } catch (err: any) {
      console.error(err);
      // Requirement 6 & 10: Error message
      setErrorMsg(err.message || "Failed to export project.");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 p-6 overflow-y-auto">
      <div className="max-w-xl mx-auto w-full space-y-8 mt-10">
        
        <div className="text-center space-y-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center shadow-inner">
             <Archive className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Export Project
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm">
            Generate a ZIP archive of your project. You can check the structure or merge files before building.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-700">
           {/* Project Summary */}
           <div className="flex items-center space-x-4 mb-8 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-600/50">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Folder className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                 <div className="font-bold text-gray-800 dark:text-white text-lg">{project.name}</div>
                 <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1 space-x-2">
                    <FileText className="w-3 h-3" />
                    <span>{project.files.length} files total</span>
                 </div>
              </div>
           </div>

           {/* Toggle: Convert to Single File */}
           <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
               <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsSingleFile(!isSingleFile)}>
                  <div className="flex items-center space-x-3">
                     <div className={clsx("p-2 rounded-lg transition-colors", isSingleFile ? "bg-blue-200 dark:bg-blue-800" : "bg-white dark:bg-gray-700")}>
                        <Layers className={clsx("w-5 h-5", isSingleFile ? "text-blue-700 dark:text-blue-300" : "text-gray-500 dark:text-gray-400")} />
                     </div>
                     <div>
                        <span className="block text-sm font-bold text-gray-800 dark:text-gray-200">Convert to Single HTML File</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">Merge CSS & JS into index.html</span>
                     </div>
                  </div>
                  
                  <div className={clsx("w-12 h-6 rounded-full p-1 transition-colors duration-300", isSingleFile ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600")}>
                      <div className={clsx("w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300", isSingleFile ? "translate-x-6" : "translate-x-0")}></div>
                  </div>
               </div>
               
               {isSingleFile && (
                   <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800/30 text-xs text-blue-600 dark:text-blue-300 flex items-start space-x-2">
                       <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                       <p>Output ZIP will contain only <strong>index.html</strong> with embedded styles and scripts.</p>
                   </div>
               )}
           </div>

           {/* Status Messages */}
           <div className="space-y-4 mb-6">
               {errorMsg && (
                 <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center space-x-3 text-sm border border-red-100 dark:border-red-900/30">
                   <AlertCircle className="w-5 h-5 shrink-0" />
                   <span>{errorMsg}</span>
                 </div>
               )}
               
               {successMsg && (
                 <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl flex items-start space-x-3 text-sm border border-green-100 dark:border-green-900/30 animate-in fade-in slide-in-from-bottom-2">
                   <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                   <div>
                      <p className="font-bold text-base">{successMsg}</p>
                      <p className="opacity-90 mt-1">Saved to Documents/WebFusionExports/{project.name}.zip</p>
                   </div>
                 </div>
               )}
           </div>

           {/* Build Button */}
           <button 
             onClick={exportProject}
             disabled={isZipping}
             className={clsx(
               "w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center space-x-3 text-lg",
               isZipping 
                ? "bg-gray-400 cursor-not-allowed" 
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/30 active:scale-[0.98] transform"
             )}
           >
             {isZipping ? (
               <>
                 <Loader2 className="w-6 h-6 animate-spin" />
                 <span>Processing...</span>
               </>
             ) : (
               <>
                 <Download className="w-6 h-6" />
                 <span>{isSingleFile ? "Build Single File" : "Build & Export ZIP"}</span>
               </>
             )}
           </button>
           
           <p className="text-center text-[10px] text-gray-400 mt-6 font-mono">
             Target: Documents/WebFusionExports/{project.name}.zip
           </p>
        </div>
      </div>
    </div>
  );
};

export default ApkBuilder;
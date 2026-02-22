import React, { useState, useEffect } from 'react';
import { Project } from '../../types';
import { Archive, CheckCircle, AlertCircle, Loader2, Download, Folder, FileText, Layers } from 'lucide-react';
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
  const [downloadData, setDownloadData] = useState<{url: string, name: string} | null>(null);

  // Cleanup object URL on unmount or when downloadData changes
  useEffect(() => {
      return () => {
          if (downloadData?.url) {
              URL.revokeObjectURL(downloadData.url);
          }
      };
  }, [downloadData]);

  const exportProject = async () => {
    setIsZipping(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    setDownloadData(null);

    try {
      if (!project) throw new Error("No project detected");
      
      const safeProjectName = project.name.replace(/[^a-zA-Z0-9-_\s]/g, '').trim() || "Project";
      let blob: Blob;
      let fileName: string;

      if (isSingleFile) {
          // --- SINGLE HTML FILE MODE ---
          const indexFile = project.files.find(f => f.name === 'index.html');
          if (!indexFile) throw new Error("Project must contain 'index.html' for Single File conversion.");

          let finalHtml = indexFile.content;

          // Merge CSS
          const cssFile = project.files.find(f => f.name === 'style.css');
          if (cssFile) {
              const cssBlock = `\n<style>\n/* Injected from style.css */\n${cssFile.content}\n</style>\n`;
              if (finalHtml.includes('</head>')) {
                  finalHtml = finalHtml.replace('</head>', `${cssBlock}</head>`);
              } else if (finalHtml.includes('<body')) {
                  finalHtml = finalHtml.replace(/<body/i, (match) => `${cssBlock}${match}`);
              } else {
                  finalHtml = `${cssBlock}${finalHtml}`;
              }
              finalHtml = finalHtml.replace(/<link\s+[^>]*href=["'](.*?\/)?style\.css["'][^>]*>/gi, '');
          }

          // Merge JS
          const jsFile = project.files.find(f => f.name === 'script.js') || project.files.find(f => f.name === 'main.js');
          if (jsFile) {
              const jsBlock = `\n<script>\n/* Injected from ${jsFile.name} */\n${jsFile.content}\n</script>\n`;
              if (finalHtml.includes('</body>')) {
                  finalHtml = finalHtml.replace('</body>', `${jsBlock}</body>`);
              } else {
                  finalHtml = `${finalHtml}${jsBlock}`;
              }
              const jsNameRegex = jsFile.name.replace('.', '\\.');
              const scriptTagRegex = new RegExp(`<script\\s+[^>]*src=["'](.*?\\/)?${jsNameRegex}["'][^>]*>\\s*<\\/script>`, 'gi');
              finalHtml = finalHtml.replace(scriptTagRegex, '');
          }

          // Instantiate Zip
          let zip: JSZip;
          try {
             // @ts-ignore
             zip = new JSZip();
          } catch (e) {
             try {
                 // @ts-ignore
                 zip = new JSZip.default();
             } catch (e2) {
                 throw new Error("Failed to initialize ZIP engine.");
             }
          }

          zip.file(`${safeProjectName}.html`, finalHtml);

          blob = await zip.generateAsync({ 
              type: "blob",
              compression: "DEFLATE",
              compressionOptions: { level: 6 } 
          });
          fileName = `${safeProjectName}.zip`;

      } else {
          // --- STANDARD RECURSIVE ZIP MODE ---
          let zip: JSZip;
          try {
             // Standard instantiation - works with Vite/Webpack
             // @ts-ignore
             zip = new JSZip();
          } catch (e) {
             console.error("Standard JSZip init failed, trying default property", e);
             try {
                 // Fallback for some CJS/ESM interop scenarios
                 // @ts-ignore
                 zip = new JSZip.default();
             } catch (e2) {
                 console.error("Fallback JSZip init failed", e2);
                 throw new Error("Failed to initialize ZIP engine.");
             }
          }
          
          const rootFolder = zip.folder(safeProjectName);
          if (!rootFolder) throw new Error("Could not create root folder in ZIP");

          const processFolder = (parentId: string, currentZipFolder: any) => {
            const items = project.files.filter(f => f.parentId === parentId);
            
            items.forEach(item => {
               if (item.isDirectory) {
                   const newZipFolder = currentZipFolder.folder(item.name);
                   if (newZipFolder) {
                       processFolder(item.id, newZipFolder);
                   }
               } else {
                   let content: string | Blob = item.content;
                   const isBinary = item.language === 'image' || item.language === 'font';
                   
                   if (isBinary && typeof content === 'string' && content.startsWith('data:')) {
                       const parts = content.split(',');
                       if (parts.length > 1) {
                           const base64Data = parts[1];
                           currentZipFolder.file(item.name, base64Data, { base64: true });
                       }
                   } else {
                       currentZipFolder.file(item.name, content);
                   }
               }
            });
          };

          processFolder('root', rootFolder);

          blob = await zip.generateAsync({ 
              type: "blob",
              compression: "DEFLATE",
              compressionOptions: { level: 6 } 
          });
          fileName = `${safeProjectName}.zip`;
      }
      
      // Upload to file.io
      const formData = new FormData();
      formData.append('file', blob, fileName);
      formData.append('expires', '1d'); 
      formData.append('maxDownloads', '1');

      const response = await fetch('https://file.io', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.link) {
         throw new Error("Failed to get download link");
      }

      setSuccessMsg("Download starting...");
      window.location.href = data.link;

    } catch (err: any) {
      console.error("Export error:", err);
      setErrorMsg(err.message || "An unexpected error occurred during export.");
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
            Download Project
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm">
            Generate a ZIP archive of your project or a single HTML file for easy sharing.
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
                       <p>Output ZIP will contain only <strong>index.html</strong> with all CSS and JS embedded inside it.</p>
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
                      <p className="opacity-90 mt-1">Your project has been prepared and is ready for download.</p>
                   </div>
                 </div>
               )}
           </div>

           {/* Download Button */}
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
                 <span>Preparing & Uploading...</span>
               </>
             ) : (
               <>
                 <Download className="w-6 h-6" />
                 <span>{isSingleFile ? "Prepare HTML ZIP" : "Prepare ZIP"}</span>
               </>
             )}
           </button>
           
           <p className="text-center text-[10px] text-gray-400 mt-6 font-mono">
             Project: {project.name}.zip
           </p>
        </div>
      </div>
    </div>
  );
};

export default ApkBuilder;

import React, { useState } from 'react';
import { AppSettings, Project } from '../../types';
import { Plus, Folder, Clock, Trash, Copy, Code, FileCode, AlertCircle, Download, Sparkles, Package } from 'lucide-react';
import AIGeneratorModal from './AIGeneratorModal';
import clsx from 'clsx';

interface ProjectListProps {
  projects: Project[];
  settings?: AppSettings;
  onCreate: (name: string, type: 'html' | 'php') => void;
  onOpen: (project: Project) => void;
  onBuild?: (project: Project) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAIProjectCreated?: (project: Project) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, settings, onCreate, onOpen, onBuild, onDelete, onDuplicate, onAIProjectCreated }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      onCreate(newProjectName, 'html');
      setShowCreateModal(false);
      setNewProjectName('');
    }
  };

  const confirmDelete = () => {
    if (projectToDelete) {
      onDelete(projectToDelete);
      setProjectToDelete(null);
    }
  };

  const downloadProject = (project: Project) => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", project.name + ".json");
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 pb-20 transition-colors">
      
      {/* Empty State */}
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center mt-10">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm mb-4">
            <Folder className="w-12 h-12 text-blue-200 dark:text-blue-800" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">No Projects Found</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-xs mt-2 text-sm">Create your first mobile web project to get started with Buildora.</p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div 
            key={project.id}
            onClick={() => onOpen(project)}
            className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer overflow-hidden flex flex-col"
          >
            <div className={clsx(
                "h-24 flex items-center justify-center",
                project.type === 'php' ? "bg-gradient-to-br from-purple-500 to-indigo-600" : "bg-gradient-to-br from-orange-400 to-red-500"
            )}>
                {project.type === 'php' ? (
                    <FileCode className="w-10 h-10 text-white/90" />
                ) : (
                    <Code className="w-10 h-10 text-white/90" />
                )}
            </div>
            
            <div className="p-4 flex-1">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate pr-2">{project.name}</h3>
                <span className={clsx(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                    project.type === 'php' ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                )}>
                    {project.type}
                </span>
              </div>
              <div className="flex items-center text-gray-400 dark:text-gray-500 text-xs mt-4 space-x-2">
                <Clock className="w-3 h-3" />
                <span>{formatDate(project.lastModified)}</span>
              </div>
            </div>

            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 flex justify-end space-x-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        if(onBuild) onBuild(project);
                    }}
                    className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm rounded-md transition-all"
                    title="Build APK"
                >
                    <Package className="w-4 h-4" />
                </button>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        downloadProject(project);
                    }}
                    className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm rounded-md transition-all"
                    title="Export JSON"
                >
                    <Download className="w-4 h-4" />
                </button>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate(project.id);
                    }}
                    className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm rounded-md transition-all"
                    title="Duplicate"
                >
                    <Copy className="w-4 h-4" />
                </button>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(project.id);
                    }}
                    className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm rounded-md transition-all"
                    title="Delete"
                >
                    <Trash className="w-4 h-4" />
                </button>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-24 right-6 flex flex-col space-y-3 z-30">
        <button 
            onClick={() => setShowAIModal(true)}
            className="w-14 h-14 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 rounded-full shadow-lg shadow-purple-900/10 flex items-center justify-center hover:bg-purple-50 dark:hover:bg-gray-700 hover:scale-105 transition-all border border-purple-100 dark:border-purple-900/30"
            title="Generate AI Tool"
        >
            <Sparkles className="w-6 h-6" />
        </button>
        <button 
            onClick={() => setShowCreateModal(true)}
            className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center hover:bg-blue-700 hover:scale-105 transition-all"
            title="New Project"
        >
            <Plus className="w-7 h-7" />
        </button>
      </div>

      {/* New Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 relative z-10 animate-in fade-in zoom-in duration-200 transition-colors">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">New Project</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Name</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-gray-700 dark:text-white"
                  placeholder="My Awesome App"
                />
              </div>
              <div className="flex space-x-3">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!newProjectName.trim()}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md shadow-blue-200 dark:shadow-none transition-colors disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Generator Modal */}
      {showAIModal && settings && (
          <AIGeneratorModal 
            settings={settings}
            onClose={() => setShowAIModal(false)}
            onProjectCreated={(p) => onAIProjectCreated && onAIProjectCreated(p)}
          />
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setProjectToDelete(null)}></div>
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6 relative z-10 animate-in fade-in zoom-in duration-200">
             <div className="flex items-center space-x-3 text-red-600 mb-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Delete Project?</h3>
             </div>
             <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
               Are you sure you want to delete this project? This action cannot be undone.
             </p>
             <div className="flex space-x-3">
               <button 
                 onClick={() => setProjectToDelete(null)}
                 className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={confirmDelete}
                 className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium shadow-md shadow-red-200 dark:shadow-none transition-colors"
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

export default ProjectList;
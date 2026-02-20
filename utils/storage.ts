import { Project, File } from '../types';

const STORAGE_KEY = 'buildora_projects';

export const getProjects = (): Project[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  try {
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to parse projects from storage", e);
    return [];
  }
};

export const saveProjects = (projects: Project[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

export const saveProject = (project: Project) => {
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === project.id);
  if (index !== -1) {
    projects[index] = project;
  } else {
    projects.push(project);
  }
  saveProjects(projects);
};

export const deleteProject = (id: string) => {
  const projects = getProjects().filter(p => p.id !== id);
  saveProjects(projects);
};

export const duplicateProject = (id: string): Project | null => {
  const projects = getProjects();
  const original = projects.find(p => p.id === id);
  
  if (!original) return null;

  // Deep copy the project
  const newProject: Project = JSON.parse(JSON.stringify(original));
  
  // Update unique identifiers
  newProject.id = Date.now().toString();
  newProject.name = `${original.name} Copy`;
  newProject.lastModified = Date.now();
  
  // Regenerate file IDs to ensure uniqueness
  newProject.files = newProject.files.map(f => ({
    ...f,
    id: Date.now().toString() + Math.random().toString().slice(2)
  }));

  projects.unshift(newProject);
  saveProjects(projects);
  
  return newProject;
};

export const createProject = (name: string, type: 'html' | 'php'): Project => {
  const indexContent = type === 'html' 
    ? `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to ${name}</h1>
        <p>Start editing this file!</p>
        <button id="clickMe">Click Me</button>
    </div>
    <script src="script.js"></script>
</body>
</html>`
    : `<?php
  // Basic PHP Local Server Simulation
  $title = "${name}";
  echo "<h1>Welcome to " . $title . "</h1>";
  echo "<p>PHP Server is simulated in this environment.</p>";
?>`;

  const styleContent = `body {
    font-family: system-ui, -apple-system, sans-serif;
    padding: 2rem;
    background-color: #f0f9ff;
    color: #333;
}
.container {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    text-align: center;
}
button {
    background: #2563eb;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    margin-top: 1rem;
}
button:hover {
    background: #1d4ed8;
}`;

  const jsContent = `document.getElementById('clickMe').addEventListener('click', () => {
    alert('Hello from Buildora!');
});`;

  const files: File[] = [
    {
      id: '1',
      name: type === 'html' ? 'index.html' : 'index.php',
      content: indexContent,
      language: type === 'html' ? 'html' : 'php',
      parentId: 'root'
    },
    {
      id: '2',
      name: 'style.css',
      content: styleContent,
      language: 'css',
      parentId: 'root'
    },
    {
      id: '3',
      name: 'script.js',
      content: jsContent,
      language: 'javascript',
      parentId: 'root'
    }
  ];

  return {
    id: Date.now().toString(),
    name,
    type,
    lastModified: Date.now(),
    files
  };
};
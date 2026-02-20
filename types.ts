export type ViewMode = 'dashboard' | 'editor' | 'preview' | 'export' | 'settings' | 'ai';

export type FileLanguage = 'html' | 'css' | 'javascript' | 'json' | 'xml' | 'php' | 'image' | 'font';

export interface File {
  id: string;
  name: string;
  content: string; // For images/fonts, this is a Base64 Data URL
  language: FileLanguage;
  parentId: string; // 'root' or id of a folder
  isDirectory?: boolean;
  isOpen?: boolean; // For tab management
}

export interface Project {
  id: string;
  name: string;
  type: 'html' | 'php';
  lastModified: number;
  files: File[];
  thumbnail?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  fontSize: number;
  autoSave: boolean;
  wordWrap: boolean;
  openRouterApiKey?: string;
  openRouterModel?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ConsoleMessage {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info' | 'system';
  message: string;
  timestamp: number;
}

export interface Keystore {
  alias: string;
  created: number;
  fingerprint: string;
}

export interface BuildConfig {
  // Branding
  appName: string;
  packageName: string;
  versionCode: number;
  versionName: string;
  icon?: string; // Data URL
  splash?: string; // Data URL
  splashBackgroundColor: string;
  
  // App Behavior
  orientation: 'portrait' | 'landscape' | 'sensor' | 'auto';
  fullscreen: boolean;
  statusBarColor: string;
  zoomEnabled: boolean;
  pullToRefresh: boolean;

  // WebView Settings
  javascriptEnabled: boolean;
  domStorageEnabled: boolean;
  cacheMode: 'default' | 'no-cache' | 'offline';
  hardwareAccel: boolean;
  mixedContentMode: 'always' | 'never' | 'compatibility';

  // Permissions
  internetPermission: boolean;
  cameraPermission: boolean;
  storagePermission: boolean;
  locationPermission: boolean;
  
  // System
  clearCache: boolean;
  keystore?: Keystore;
}
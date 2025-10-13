// Declarações de tipo para Electron
// Como fallback até que o pacote electron seja instalado corretamente

declare module 'electron' {
  export * from 'electron/main';
  export * from 'electron/common';
  export * from 'electron/renderer';
}

declare module 'electron/main' {
  import { EventEmitter } from 'events';
  
  export interface App extends EventEmitter {
    whenReady(): Promise<void>;
    quit(): void;
    getPath(name: string): string;
    on(event: 'window-all-closed' | 'before-quit' | 'activate', listener: () => void): this;
  }
  
  export interface BrowserWindowConstructorOptions {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    webPreferences?: WebPreferences;
    frame?: boolean;
    backgroundColor?: string;
    show?: boolean;
    autoHideMenuBar?: boolean;
    title?: string;
  }
  
  export interface WebPreferences {
    preload?: string;
    contextIsolation?: boolean;
    nodeIntegration?: boolean;
    sandbox?: boolean;
    webSecurity?: boolean;
    allowRunningInsecureContent?: boolean;
  }
  
  export interface WebContents extends EventEmitter {
    openDevTools(): void;
    send(channel: string, ...args: any[]): void;
    getURL(): string;
    once(event: string, listener: (...args: any[]) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    loadURL(url: string): Promise<void>;
    loadFile(filePath: string): Promise<void>;
  }
  
  export class BrowserWindow {
    webContents: WebContents;
    constructor(options: BrowserWindowConstructorOptions);
    loadURL(url: string): Promise<void>;
    loadFile(filePath: string): Promise<void>;
    on(event: 'closed' | 'ready-to-show', listener: () => void): this;
    once(event: 'ready-to-show', listener: () => void): this;
    show(): void;
    close(): void;
    isDestroyed(): boolean;
    setMenu(menu: any): void;
    static getAllWindows(): BrowserWindow[];
  }
  
  export interface IpcMain extends EventEmitter {
    handle(channel: string, listener: (event: any, ...args: any[]) => Promise<any> | any): void;
  }
  
  export interface Dialog {
    showMessageBox(options: any): Promise<any>;
    showOpenDialog(options: any): Promise<any>;
    showSaveDialog(options: any): Promise<any>;
  }
  
  export const app: App;
  export const ipcMain: IpcMain;
  export const dialog: Dialog;
}

declare module 'electron/common' {}
declare module 'electron/renderer' {}


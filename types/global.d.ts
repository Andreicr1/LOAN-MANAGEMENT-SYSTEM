// Declarações de tipos globais para resolver erros de compilação

declare module 'react';
declare module 'react/jsx-runtime';
declare module 'electron';
declare module 'better-sqlite3';
declare module 'bcryptjs';
declare module 'nodemailer';
declare module 'pdfkit';
declare module 'docusign-esign';

// Adicionar resourcesPath ao tipo Process
declare namespace NodeJS {
  interface Process {
    resourcesPath: string;
  }
}

// Declarações globais para JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
  interface Window {
    electronAPI?: any
  }
}

export {};

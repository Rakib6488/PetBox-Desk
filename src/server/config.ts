import dotenv from 'dotenv';
import type { GoogleGenAI } from '@google/genai';

dotenv.config();

export const HOST = process.env.HOST || '0.0.0.0';
export const PORT = Number(process.env.PORT || 10000);

function normalizePassword(host: string, value: string) {
  return /gmail|googlemail/i.test(host) ? value.replace(/\s+/g, '') : value.trim();
}

export const smtpConfig = () => {
  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;
  return {
    host,
    port,
    secure,
    auth: { user: process.env.SMTP_USER || '', pass: normalizePassword(host, process.env.SMTP_PASS || '') },
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  };
};

export const imapConfig = () => {
  const host = process.env.IMAP_HOST || '';
  return {
  host,
  port: Number(process.env.IMAP_PORT || 993),
  secure: true,
  auth: { user: process.env.IMAP_USER || '', pass: normalizePassword(host, process.env.IMAP_PASS || '') },
  logger: false as const,
  };
};

let geminiClient: GoogleGenAI | null = null;
export async function getGemini() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!geminiClient) {
    const { GoogleGenAI } = await import('@google/genai');
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

import dotenv from 'dotenv';
import type { GoogleGenAI } from '@google/genai';

dotenv.config();

export const PORT = Number(process.env.PORT || 3002);

export const smtpConfig = () => ({
  host: process.env.SMTP_HOST || '',
  port: Number(process.env.SMTP_PORT || 587),
  secure: (process.env.SMTP_PORT || '587') === '465',
  auth: { user: process.env.SMTP_USER || '', pass: (process.env.SMTP_PASS || '').replace(/\s+/g, '') },
});

export const imapConfig = () => ({
  host: process.env.IMAP_HOST || '',
  port: Number(process.env.IMAP_PORT || 993),
  secure: true,
  auth: { user: process.env.IMAP_USER || '', pass: (process.env.IMAP_PASS || '').replace(/\s+/g, '') },
  logger: false as const,
});

let geminiClient: GoogleGenAI | null = null;
export async function getGemini() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!geminiClient) {
    const { GoogleGenAI } = await import('@google/genai');
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

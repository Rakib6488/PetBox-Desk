import dotenv from 'dotenv';
import dns from 'node:dns/promises';
import net from 'node:net';
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
    tls: undefined as { servername?: string; minVersion: 'TLSv1.2' } | undefined,
  };
};

export const resendConfig = () => ({
  apiKey: process.env.RESEND_API_KEY || '',
  from: process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || '',
});

export async function smtpTransportConfig() {
  const config = smtpConfig();
  if (!config.host || net.isIP(config.host)) return config;

  const addresses = await dns.resolve4(config.host);
  const ipv4Address = addresses[0];
  if (!ipv4Address) throw new Error(`No IPv4 address found for SMTP host ${config.host}.`);

  return {
    ...config,
    host: ipv4Address,
    tls: {
      servername: config.host,
      minVersion: 'TLSv1.2' as const,
    },
  };
}

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

# Standalone WhatsApp service

This folder is **not** the normal Petbox Desk production startup path.

## Which server is active in production?

The root application is the active path:

```text
npm start
  -> scripts/start.ts
  -> server.ts
  -> /api/whatsapp (server/src/whatsapp/routes.ts)
```

That server handles the Admin Portal, Agent Portal, BI Portal, PostgreSQL,
session-cookie authentication, REST APIs and the integrated WhatsApp routes.

## When is this folder used?

`server/src/index.ts` is an optional standalone WhatsApp service. Run it only
when WhatsApp must be deployed as a separate internal service, for example:

```bash
cd server
npm install
npm run dev
```

It uses `WHATSAPP_API_KEY` instead of the main app's session cookie and should
only be called by trusted internal services. Do not run it alongside the root
server on the same port. Do not expose it directly to the public internet.

The root server and this standalone service share the WhatsApp implementation
under `server/src/whatsapp/`, but they are two different Express processes.

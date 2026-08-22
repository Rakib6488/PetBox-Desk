import { dbPool } from '../src/server/db';
import { hashPassword } from '../src/server/auth';

type BootstrapRole = 'admin' | 'supervisor' | 'agent' | 'bi';

const users: Array<{ role: BootstrapRole; email?: string; name?: string; password?: string }> = [
  { role: 'admin', email: process.env.ADMIN_EMAIL, name: process.env.ADMIN_NAME, password: process.env.ADMIN_PASSWORD },
  { role: 'supervisor', email: process.env.SUPERVISOR_EMAIL, name: process.env.SUPERVISOR_NAME, password: process.env.SUPERVISOR_PASSWORD },
  { role: 'agent', email: process.env.AGENT_EMAIL, name: process.env.AGENT_NAME, password: process.env.AGENT_PASSWORD },
  { role: 'bi', email: process.env.BI_EMAIL, name: process.env.BI_NAME, password: process.env.BI_PASSWORD },
];

if (!dbPool) throw new Error('DATABASE_URL is required to bootstrap users.');

for (const user of users) {
  if (!user.email || !user.password) continue;
  if (user.password.length < 8) throw new Error(`${user.role.toUpperCase()}_PASSWORD must be at least 8 characters.`);
  await dbPool.query(
    `INSERT INTO users (id, name, email, role, password_hash, status, avatar)
     VALUES ($1, $2, lower($3), $4, $5, 'offline', '')
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       role = EXCLUDED.role,
       password_hash = EXCLUDED.password_hash,
       status = 'offline'`,
    [`user_${user.role}`, user.name || user.role, user.email.trim(), user.role, hashPassword(user.password)]
  );
  console.log(`Bootstrapped ${user.role} user ${user.email}.`);
}

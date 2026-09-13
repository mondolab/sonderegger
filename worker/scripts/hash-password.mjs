// Genera el hash PBKDF2-SHA256 para la contraseña del taller.
// Uso: node scripts/hash-password.mjs "MiContraseña"
//
// El worker usa EXACTAMENTE el mismo algoritmo para verificar.
import { pbkdf2Sync, randomBytes } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Uso: node scripts/hash-password.mjs "MiContraseña"');
  process.exit(1);
}

const iterations = 100000;
const salt = randomBytes(16);

const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256');

const saltB64 = salt.toString('base64');
const hashB64 = hash.toString('base64');

console.log(`pbkdf2_sha256$${iterations}$${saltB64}$${hashB64}`);

console.log('\nPara configurar la contraseña desde SQL:');
console.log(`UPDATE configuracion SET valor='pbkdf2_sha256$${iterations}$${saltB64}$${hashB64}', updated_at=datetime('now') WHERE clave='password_hash';`);
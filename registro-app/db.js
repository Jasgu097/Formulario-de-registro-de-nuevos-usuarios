const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'db', 'app.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Tabla de usuarios
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    correo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    edad INTEGER NOT NULL,
    password_hash TEXT NOT NULL,
    verificado INTEGER NOT NULL DEFAULT 0,
    token_verificacion TEXT,
    token_expira INTEGER,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

module.exports = db;

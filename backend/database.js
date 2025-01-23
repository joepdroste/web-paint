import sqlite3 from 'sqlite3';
sqlite3.verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        passwordHash TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        imageData TEXT,
        FOREIGN KEY(userId) REFERENCES users(id)
    )`);
});

export { db };
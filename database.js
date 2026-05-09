const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./tourist_data.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS places (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        category TEXT,
        description TEXT,
        rating REAL,
        reviews_count INTEGER,
        location TEXT,
        nearest_station TEXT,
        nearest_airport TEXT,
        image_url TEXT
    )`);
});

module.exports = db;

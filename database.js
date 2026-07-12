const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
    path.join(__dirname, "garage.db"),
    (err) => {

        if (err) {
            console.error("❌ Ошибка подключения к SQLite:", err.message);
        } else {
            console.log("✅ SQLite подключена");

            db.run(`
                CREATE TABLE IF NOT EXISTS products (

                    id INTEGER PRIMARY KEY AUTOINCREMENT,

                    title TEXT NOT NULL,

                    price REAL NOT NULL,

                    status TEXT,

                    isNew INTEGER,

                    description TEXT,

                    images TEXT

                )
            `);

        }

    }
);

module.exports = db;
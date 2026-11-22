const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const databasePath = process.env.DB_PATH || path.join(__dirname, 'data', 'planning.sqlite');
fs.mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true });

const database = new Database(databasePath);
database.pragma('foreign_keys = ON');

async function query(text, params = []) {
  if (text.includes(';')) {
    database.exec(text);
    return { rows: [], rowCount: 0 };
  }

  const statement = database.prepare(text.replace(/\$\d+/g, '?'));
  if (statement.reader) {
    const rows = statement.all(...params);
    return { rows, rowCount: rows.length };
  }

  const result = statement.run(...params);
  return { rows: [], rowCount: result.changes };
}

module.exports = {
  query,
  database
};
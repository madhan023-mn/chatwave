const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = path.join(__dirname, '..', '..', 'chatwave.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

if (process.env.NODE_ENV === 'development') {
  console.log('✅ SQLite connected');
}

const query = async (text, params = []) => {
  // Convert $1, $2 placeholders to ? if any exist
  let sqliteSql = text.replace(/\$\d+/g, '?');
  
  // Replace true/false with 1/0 for sqlite
  const formattedParams = params.map(p => typeof p === 'boolean' ? (p ? 1 : 0) : p);

  try {
    const isSelect = sqliteSql.trim().toUpperCase().startsWith('SELECT') || 
                     sqliteSql.trim().toUpperCase().startsWith('PRAGMA') || 
                     sqliteSql.toUpperCase().includes('RETURNING');
                     
    const stmt = db.prepare(sqliteSql);
    
    if (isSelect) {
      const rows = stmt.all(...formattedParams);
      return { rows };
    } else {
      const info = stmt.run(...formattedParams);
      return { 
        rows: [], 
        insertId: info.lastInsertRowid, 
        changes: info.changes 
      };
    }
  } catch (err) {
    console.error('Query error:', err.message, '\nSQL:', sqliteSql);
    throw err;
  }
};

module.exports = { pool: { end: () => db.close() }, query, db };

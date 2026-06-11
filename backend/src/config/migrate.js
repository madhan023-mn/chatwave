const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

async function migrate() {
  console.log('🔄 Running ChatWave SQLite schema migration...');
  const dbPath = path.join(__dirname, '..', '..', 'chatwave.db');
  const schemaPath = path.join(__dirname, '..', '..', 'schema.sqlite.sql');
  
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  const sql = fs.readFileSync(schemaPath, 'utf8');

  try {
    db.exec(sql);
    console.log('✅ SQLite schema migration complete!');
    console.log('   Admin login: admin@chatwave.app / Admin@123');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrate();

const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(`/data/sqlite/${process.env.DB_NAME}.sqlite`, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to the SQLite database');
  }
});

module.exports = db;

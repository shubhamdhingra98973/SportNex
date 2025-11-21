export const USER_TABLE = `
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        username TEXT UNIQUE,
        password TEXT,
        created_at INTEGER
    )
`;
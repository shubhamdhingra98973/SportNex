export const EVENT_TABLE = `
    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        eventTitle TEXT NOT NULL,
        eventDescription TEXT,
        eventLocation TEXT,
        maxPlayerLimit INTEGER,
        eventDateTime INTEGER,
        createdDate INTEGER,
        hostedBy TEXT,
        participants TEXT
    )
`;


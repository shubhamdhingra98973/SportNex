import { SQLiteTables } from '@storage/SQLiteTables';
import SQLite from 'react-native-sqlite-storage';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

SQLite.enablePromise(true);

export interface User {
  id?: number;
  name: string;
  username: string;
  password: string;
}

export default class SqliteManager {
  private static dbInstance: SQLite.SQLiteDatabase | null = null;

  /** Open or return existing database */
  static async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    const dbName = 'SportNex.db';

    if (!this.dbInstance) {
      try {
        this.dbInstance = await SQLite.openDatabase({
          name: dbName,
          location: 'default',
        });
        console.log('✅ Database opened successfully');
      } catch (error) {
        console.error('❌ Error opening database:', error);
        throw new Error('Database initialization failed');
      }
    }
    return this.dbInstance;
  }

  /** Check if database is initialized (users table exists) */
  static async isDatabaseInitialized(): Promise<boolean> {
    try {
      if (!this.dbInstance) {
        // Open database without initializing
        const dbName = 'SportNex.db';
        this.dbInstance = await SQLite.openDatabase({
          name: dbName,
          location: 'default',
        });
      }
      
      const [results] = await this.dbInstance.executeSql(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='users'`
      );
      return results.rows.length > 0;
    } catch (error) {
      console.error('❌ Error checking database initialization:', error);
      return false;
    }
  }

  static async getDBPath(): Promise<string> {
    const dbName = `SportNex.db`;
    let dbPath = '';

    if (Platform.OS === 'ios') {
      dbPath = `${RNFS.LibraryDirectoryPath}/LocalDatabase/${dbName}`;
    } else {
      dbPath = `${RNFS.DocumentDirectoryPath}/LocalDatabase/${dbName}`;
    }

    console.log('✅ ✅ ✅ SQLITE DATABASE PATH:', dbPath);
    return dbPath;
  }

  /** Initialize users table */
  static async initializeDatabase(): Promise<void> {
    try {
      // Get database instance (open if not already open)
      if (!this.dbInstance) {
        const dbName = 'SportNex.db';
        this.dbInstance = await SQLite.openDatabase({
          name: dbName,
          location: 'default',
        });
      }
      await this.dbInstance.executeSql('PRAGMA journal_mode = WAL;');
      await SqliteManager.getDBPath();
      // Check if already initialized
      const isInitialized = await this.isDatabaseInitialized();
      if (isInitialized) {
        console.log('✅ Database alrdy initialized');
        return;
      }

      for (const [tableName, tableSQL] of Object.entries(SQLiteTables)) {
        try {
          await this.dbInstance.executeSql(tableSQL);
          console.log(`✅ Table initialized: ${tableName}`);
        } catch (error) {
          console.error(`❌ Error initializing table: ${tableName}`, error);
        }
      }
      console.log('✅ All table initialized');
    } catch (error) {
      console.error('❌ Error initializing database:', error);
      throw error;
    }
  }

  

  /** Close database */
  static async closeDatabase(): Promise<void> {
    if (this.dbInstance) {
      try {
        await this.dbInstance.close();
        this.dbInstance = null;
        console.log('📴 Database closed');
      } catch (error) {
        console.error('❌ Error closing database:', error);
      }
    }
  }
}

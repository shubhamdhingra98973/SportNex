import {generateNewObjectId} from '@global';

import SqliteManager from '@storage/sqlite/SqliteManager';
import {UserSchema} from '@storage/sqlite/schema/userSchema';
import {
  decodeData,
  nullable,
  serializeForDB,
} from '@storage/sqlite/SqliteHelperFunctions';
import writeQueue from '@storage/sqlite/SqliteWriteQueue';

const jsonFields: any[] = [];

export default class UserRepository {
  /** Helper to build values array */
  private static buildValues(userObj: UserSchema): any[] {
    return [
      nullable(userObj.name),
      nullable(userObj.username),
      nullable(userObj.password),
      nullable(userObj.created_at),
    ];
  }

  /** Insert New User Object */
  static async registerUser(
    user_obj: UserSchema,
  ): Promise<UserSchema | void> {
    return new Promise(resolve => {
      writeQueue.enqueue(async () => {
        const decodedUser = decodeData(user_obj);
        const user: UserSchema = {
          ...decodedUser,
          id: decodedUser.id ?? generateNewObjectId(),
          created_at: decodedUser.created_at ?? new Date().toISOString(),
        };
        const userObj = serializeForDB(user, jsonFields);

        try {
          const db = await SqliteManager.getDatabase();
          const query = `INSERT INTO users (
              id, name, username, password, created_at
            ) VALUES (?, ?, ?, ?, ?)`;

          const values = [nullable(userObj.id), ...this.buildValues(userObj)];
          const results = await db.executeSql(query, values);

          if (results?.[0]?.rowsAffected > 0) {
            console.log(`✅ Success [USER] Insert`);
            resolve(user);
            return;
          }
          resolve(undefined);
        } catch (error) {
          console.error(`❌ [USER] Insert error (${user.id}):`, error);
          resolve(undefined);
        }
      });
    });
  }

    /** Login user - check if username and password match */
    static async loginUser(
        username: string,
        password: string,
      ): Promise<UserSchema | null> {
        try {
        const db = await SqliteManager.getDatabase();
          const [results] = await db.executeSql(
            `SELECT * FROM users WHERE username = ? AND password = ?`,
            [username, password],
          );
    
          if (results.rows.length > 0) {
            const row = results.rows.item(0);
            return {
              id: row.id,
              name: row.name,
              username: row.username,
              password: row.password,
              created_at: row.created_at
            };
          }
          return null;
        } catch (error) {
          console.error('❌ Error logging in user:', error);
          throw new Error('Failed to login');
        }
      }

  /** Check whether a username already exists */
  static async checkUsernameExists(username: string): Promise<boolean> {
    try {
      const db = await SqliteManager.getDatabase();
      const [results] = await db.executeSql(
        `SELECT COUNT(*) as count FROM users WHERE username = ?`,
        [username],
      );

      const count =
        results.rows.length > 0 ? results.rows.item(0).count ?? 0 : 0;
      return count > 0;
    } catch (error) {
      console.error('❌ Error checking username existence:', error);
      throw new Error('Failed to check username');
    }
  }


  /** Clear User Table */
  static async clearUserTable(): Promise<void> {
    return new Promise(resolve => {
      writeQueue.enqueue(async () => {
        try {
          const db = await SqliteManager.getDatabase();
          await db.executeSql('DELETE FROM users');
          console.log('✅ Success [users] data cleared');
          resolve();
        } catch (error) {
          console.error('❌ [USER] userTable error', error);
          resolve();
        }
      });
    });
  }
}

import {generateNewObjectId} from '@global';

import SqliteManager from '@storage/sqlite/SqliteManager';
import {EventSchema} from '@storage/sqlite/schema/EventSchema';
import {
  decodeData,
  nullable,
  serializeForDB,
  deserializeFromDB,
} from '@storage/sqlite/SqliteHelperFunctions';
import writeQueue from '@storage/sqlite/SqliteWriteQueue';

const jsonFields: string[] = ['hostedBy', 'participants'];

export default class EventRepository {
  /** Helper to build values array */
  private static buildValues(eventObj: any): any[] {
    return [
      nullable(eventObj.eventTitle),
      nullable(eventObj.eventDescription),
      nullable(eventObj.eventLocation),
      nullable(eventObj.maxPlayerLimit),
      nullable(eventObj.eventDateTime),
      nullable(eventObj.createdDate),
      nullable(eventObj.hostedBy), // Already serialized by serializeForDB
      nullable(eventObj.participants), // Already serialized by serializeForDB
    ];
  }

  /** Insert New Event Object */
  static async createEvent(
    event_obj: EventSchema,
  ): Promise<EventSchema | void> {
    return new Promise(resolve => {
      writeQueue.enqueue(async () => {
        const decodedEvent = decodeData(event_obj);
        const event: EventSchema = {
          ...decodedEvent,
          id: decodedEvent.id ?? generateNewObjectId(),
          createdDate: decodedEvent.createdDate ?? Date.now(),
        };
        const eventObj = serializeForDB(event, jsonFields);
        console.log("EventObj :",JSON.stringify(eventObj));
        try {
          const db = await SqliteManager.getDatabase();
          const query = `INSERT INTO events (
              id, eventTitle, eventDescription, eventLocation, maxPlayerLimit, 
              eventDateTime, createdDate, hostedBy, participants
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

          const values = [nullable(eventObj.id), ...this.buildValues(eventObj)];
          const results = await db.executeSql(query, values);

          if (results?.[0]?.rowsAffected > 0) {
            console.log(`✅ Success [EVENT] Insert`);
            resolve(event);
            return;
          }
          resolve(undefined);
        } catch (error) {
          console.error(`❌ [EVENT] Insert error (${event.id}):`, error);
          resolve(undefined);
        }
      });
    });
  }

  /** Get all events */
  static async getAllEvents(): Promise<EventSchema[]> {
    try {
      const db = await SqliteManager.getDatabase();
      const [results] = await db.executeSql(
        `SELECT * FROM events ORDER BY createdDate DESC`,
      );

      const events: EventSchema[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        const deserialized = deserializeFromDB(row, jsonFields);
        events.push({
          id: deserialized.id,
          eventTitle: deserialized.eventTitle,
          eventDescription: deserialized.eventDescription,
          eventLocation: deserialized.eventLocation,
          maxPlayerLimit: deserialized.maxPlayerLimit,
          eventDateTime: deserialized.eventDateTime,
          createdDate: deserialized.createdDate,
          hostedBy: deserialized.hostedBy,
          participants: deserialized.participants || [],
        });
      }
      return events;
    } catch (error) {
      console.error('❌ Error getting all events:', error);
      throw new Error('Failed to get events');
    }
  }

  /** Get event by ID */
  static async getEventById(eventId: string): Promise<EventSchema | null> {
    try {
      const db = await SqliteManager.getDatabase();
      const [results] = await db.executeSql(
        `SELECT * FROM events WHERE id = ?`,
        [eventId],
      );

      if (results.rows.length > 0) {
        const row = results.rows.item(0);
        const deserialized = deserializeFromDB(row, jsonFields);
        return {
          id: deserialized.id,
          eventTitle: deserialized.eventTitle,
          eventDescription: deserialized.eventDescription,
          eventLocation: deserialized.eventLocation,
          maxPlayerLimit: deserialized.maxPlayerLimit,
          eventDateTime: deserialized.eventDateTime,
          createdDate: deserialized.createdDate,
          hostedBy: deserialized.hostedBy,
          participants: deserialized.participants || [],
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting event by ID:', error);
      throw new Error('Failed to get event');
    }
  }

  /** Get events by host ID */
  static async getEventsByHostId(hostId: number): Promise<EventSchema[]> {
    try {
      const db = await SqliteManager.getDatabase();
      const [results] = await db.executeSql(
        `SELECT * FROM events WHERE hostedBy LIKE ? ORDER BY eventDateTime ASC`,
        [`%"id":${hostId}%`],
      );

      const events: EventSchema[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        const deserialized = deserializeFromDB(row, jsonFields);
        events.push({
          id: deserialized.id,
          eventTitle: deserialized.eventTitle,
          eventDescription: deserialized.eventDescription,
          eventLocation: deserialized.eventLocation,
          maxPlayerLimit: deserialized.maxPlayerLimit,
          eventDateTime: deserialized.eventDateTime,
          createdDate: deserialized.createdDate,
          hostedBy: deserialized.hostedBy,
          participants: deserialized.participants || [],
        });
      }
      return events;
    } catch (error) {
      console.error('❌ Error getting events by host ID:', error);
      throw new Error('Failed to get events by host');
    }
  }

  /** Update event */
  static async updateEvent(
    eventId: string,
    event_obj: Partial<EventSchema>,
  ): Promise<boolean> {
    return new Promise(resolve => {
      writeQueue.enqueue(async () => {
        try {
          const decodedEvent = decodeData(event_obj);
          const eventObj = serializeForDB(decodedEvent, jsonFields);

          const db = await SqliteManager.getDatabase();
          const updates: string[] = [];
          const values: any[] = [];

          if (eventObj.eventTitle !== undefined) {
            updates.push('eventTitle = ?');
            values.push(nullable(eventObj.eventTitle));
          }
          if (eventObj.eventDescription !== undefined) {
            updates.push('eventDescription = ?');
            values.push(nullable(eventObj.eventDescription));
          }
          if (eventObj.eventLocation !== undefined) {
            updates.push('eventLocation = ?');
            values.push(nullable(eventObj.eventLocation));
          }
          if (eventObj.maxPlayerLimit !== undefined) {
            updates.push('maxPlayerLimit = ?');
            values.push(nullable(eventObj.maxPlayerLimit));
          }
          if (eventObj.eventDateTime !== undefined) {
            updates.push('eventDateTime = ?');
            values.push(nullable(eventObj.eventDateTime));
          }
          if (eventObj.hostedBy !== undefined) {
            updates.push('hostedBy = ?');
            values.push(nullable(eventObj.hostedBy));
          }
          if (eventObj.participants !== undefined) {
            updates.push('participants = ?');
            values.push(nullable(eventObj.participants));
          }

          if (updates.length === 0) {
            resolve(false);
            return;
          }

          values.push(eventId);
          const query = `UPDATE events SET ${updates.join(', ')} WHERE id = ?`;
          const results = await db.executeSql(query, values);

          if (results?.[0]?.rowsAffected > 0) {
            console.log(`✅ Success [EVENT] Update`);
            resolve(true);
            return;
          }
          resolve(false);
        } catch (error) {
          console.error(`❌ [EVENT] Update error (${eventId}):`, error);
          resolve(false);
        }
      });
    });
  }

  /** Add participant to event */
  static async addParticipant(
    eventId: string,
    participant: { id: number; name: string; status: 'confirmed' | 'pending' | 'rejected' | 'expired' },
  ): Promise<boolean> {
    return new Promise(resolve => {
      writeQueue.enqueue(async () => {
        try {
          const event = await this.getEventById(eventId);
          if (!event) {
            resolve(false);
            return;
          }

          const participants = event.participants || [];
          // Check if participant already exists
          const existingIndex = participants.findIndex(p => p.id === participant.id);
          if (existingIndex >= 0) {
            // Update existing participant
            participants[existingIndex] = participant;
          } else {
            // Add new participant
            participants.push(participant);
          }

          const success = await this.updateEvent(eventId, { participants });
          resolve(success);
        } catch (error) {
          console.error(`❌ [EVENT] Add participant error (${eventId}):`, error);
          resolve(false);
        }
      });
    });
  }

  /** Remove participant from event */
  static async removeParticipant(
    eventId: string,
    participantId: number,
  ): Promise<boolean> {
    return new Promise(resolve => {
      writeQueue.enqueue(async () => {
        try {
          const event = await this.getEventById(eventId);
          if (!event) {
            resolve(false);
            return;
          }

          const participants = (event.participants || []).filter(
            p => p.id !== participantId,
          );

          const success = await this.updateEvent(eventId, { participants });
          resolve(success);
        } catch (error) {
          console.error(`❌ [EVENT] Remove participant error (${eventId}):`, error);
          resolve(false);
        }
      });
    });
  }

  /** Delete event */
  static async deleteEvent(eventId: string): Promise<boolean> {
    return new Promise(resolve => {
      writeQueue.enqueue(async () => {
        try {
          const db = await SqliteManager.getDatabase();
          const results = await db.executeSql(
            `DELETE FROM events WHERE id = ?`,
            [eventId],
          );

          if (results?.[0]?.rowsAffected > 0) {
            console.log(`✅ Success [EVENT] Delete`);
            resolve(true);
            return;
          }
          resolve(false);
        } catch (error) {
          console.error(`❌ [EVENT] Delete error (${eventId}):`, error);
          resolve(false);
        }
      });
    });
  }

  /** Clear Events Table */
  static async clearEventsTable(): Promise<void> {
    return new Promise(resolve => {
      writeQueue.enqueue(async () => {
        try {
          const db = await SqliteManager.getDatabase();
          await db.executeSql('DELETE FROM events');
          console.log('✅ Success [events] data cleared');
          resolve();
        } catch (error) {
          console.error('❌ [EVENT] eventsTable error', error);
          resolve();
        }
      });
    });
  }
}


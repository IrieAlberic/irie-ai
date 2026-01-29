import Dexie, { Table } from 'dexie';
import { UploadedFile, Message, ExtractedEntity } from '../types';

class IrieDatabase extends Dexie {
  files!: Table<UploadedFile>;
  messages!: Table<Message>;
  extractedData!: Table<ExtractedEntity>;

  constructor() {
    super('IrieDB');
    // Fix: Cast this to any to avoid TS error 'Property version does not exist on type IrieDatabase'
    (this as any).version(1).stores({
      files: 'id, name, status', // Clés primaires et index
      messages: 'id, role, timestamp',
      extractedData: 'id, type, sourceDoc'
    });
  }
}

export const db = new IrieDatabase();

// Helpers pour la mise à jour partielle
export const updateFilePosition = async (id: string, x: number, y: number) => {
  await db.files.update(id, { x, y });
};

export const updateMessagePosition = async (id: string, x: number, y: number) => {
  await db.messages.update(id, { x, y });
};
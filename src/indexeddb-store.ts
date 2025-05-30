import { CacheStore } from "./cache-store";

export class MinimalKVStore extends CacheStore {
  private dbName: string;
  private storeName: string;

  constructor(dbName: string = "MinimalKVStore", storeName: string = "store") {
    super();
    this.dbName = dbName;
    this.storeName = storeName;
  }

  // Initialize the database
  private async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  // Perform a database transaction
  private async transaction<T>(
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, mode);
      const store = tx.objectStore(this.storeName);
      const request = callback(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  // Set a value
  async set<T>(key: string, value: T): Promise<void> {
    await this.transaction("readwrite", (store) => store.put(value, key));
  }

  // Get a value
  async get<T>(key: string): Promise<T | undefined> {
    return this.transaction<T | undefined>("readonly", (store) =>
      store.get(key),
    );
  }

  // Delete a key
  async delete(key: string): Promise<void> {
    await this.transaction("readwrite", (store) => store.delete(key));
  }

  // Clear all entries
  async clear(): Promise<void> {
    await this.transaction("readwrite", (store) => store.clear());
  }

  save() {}
}

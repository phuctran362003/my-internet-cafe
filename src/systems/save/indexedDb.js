const DB_NAME = 'internet-cafe-tycoon';
const DB_VERSION = 1;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves', { keyPath: 'slot' });
      if (!db.objectStoreNames.contains('metadata')) db.createObjectStore('metadata', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createIndexedDbStorage() {
  let dbPromise = null;
  const db = () => {
    if (!dbPromise) dbPromise = openDatabase();
    return dbPromise;
  };
  return {
    async putSave(record) {
      const database = await db();
      const tx = database.transaction('saves', 'readwrite');
      tx.objectStore('saves').put(record);
      await transactionDone(tx);
    },
    async getSave(slot) {
      const database = await db();
      const tx = database.transaction('saves', 'readonly');
      return requestToPromise(tx.objectStore('saves').get(slot));
    },
    async listSaves() {
      const database = await db();
      const tx = database.transaction('saves', 'readonly');
      return requestToPromise(tx.objectStore('saves').getAll());
    },
    async deleteSave(slot) {
      const database = await db();
      const tx = database.transaction('saves', 'readwrite');
      tx.objectStore('saves').delete(slot);
      await transactionDone(tx);
    },
    async putMeta(record) {
      const database = await db();
      const tx = database.transaction('metadata', 'readwrite');
      tx.objectStore('metadata').put(record);
      await transactionDone(tx);
    },
    async getMeta(id) {
      const database = await db();
      const tx = database.transaction('metadata', 'readonly');
      return requestToPromise(tx.objectStore('metadata').get(id));
    }
  };
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

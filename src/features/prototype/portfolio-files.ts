// Portfolio files are too large for localStorage (about 5 MB for the whole app state),
// so the bytes live in IndexedDB and the saved state keeps only their metadata.
const DB_NAME = "doroboty-portfolio-files";
const STORE = "files";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Ta przeglądarka nie pozwala zapisywać plików lokalnie."));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Nie udało się otworzyć lokalnego magazynu plików."));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error("Nie udało się zapisać pliku. Sprawdź wolne miejsce."));
    });
  } finally {
    db.close();
  }
}

export async function putPortfolioFile(id: string, blob: Blob) {
  await withStore("readwrite", (store) => store.put(blob, id));
}
export async function getPortfolioFile(id: string): Promise<Blob | undefined> {
  return withStore("readonly", (store) => store.get(id));
}
export async function deletePortfolioFile(id: string) {
  try {
    await withStore("readwrite", (store) => store.delete(id));
  } catch {
    // A leftover blob is harmless; the entry itself is already removed.
  }
}

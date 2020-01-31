import { Injectable, Inject } from '@angular/core';
import { openDatabase, DBMode, Key, RequestEvent, CreateObjectStore } from './ngx-indexed-db';
import { createTransaction, optionsGenerator, validateBeforeTransaction } from '../utils';
import { CONFIG_TOKEN, DBConfig } from './ngx-indexed-db.meta';

@Injectable()
export class NgxIndexedDBService {
	indexedDB =
		window.indexedDB || (<any>window).mozIndexedDB || (<any>window).webkitIndexedDB || (<any>window).msIndexedDB;

	constructor(@Inject(CONFIG_TOKEN) private dbConfig: DBConfig) {
		if (!dbConfig.name) {
			throw new Error('NgxIndexedDB: Please, provide the dbName in the configuration');
		}
		if (!dbConfig.version) {
			throw new Error('NgxIndexedDB: Please, provide the db version in the configuration');
		}
		CreateObjectStore(dbConfig.name, dbConfig.version, dbConfig.objectStoresMeta, dbConfig.migrationFactory);
	}

	add<T>(storeName: string, value: T, key?: any) {
		return new Promise<number>((resolve, reject) => {
			openDatabase(this.dbConfig.name, this.dbConfig.version, this.dbConfig)
				.then((db: IDBDatabase) => {
					const transaction = createTransaction(
							db,
							optionsGenerator(DBMode.readwrite, storeName, reject, resolve)
						),
						objectStore = transaction.objectStore(storeName);
					const request = objectStore.add(value, key);
					request.onsuccess = (evt: any) => {
						key = evt.target.result;
						resolve(key);
						db.close();
					};
					request.onerror = function(e) {
						reject(e);
						db.close();
					};
				})
				.catch(err => reject(err));
		});
	}

	getByKey<T>(storeName: string, key: any) {
		return new Promise<any>((resolve, reject) => {
			openDatabase(this.dbConfig.name, this.dbConfig.version, this.dbConfig)
				.then((db: IDBDatabase) => {
					const transaction = createTransaction(
							db,
							optionsGenerator(DBMode.readonly, storeName, reject, resolve)
						),
						objectStore = transaction.objectStore(storeName);
					const request = objectStore.get(key);
					request.onsuccess = function(event: Event) {
						resolve((<any>event.target).result);
						db.close();
					};
					request.onerror = function(e) {
						reject(e);
						db.close();
					};
				})
				.catch(err => reject(err));
		});
	}

	getByID<T>(storeName: string, id: string | number) {
		return new Promise<T>((resolve, reject) => {
			openDatabase(this.dbConfig.name, this.dbConfig.version, this.dbConfig)
				.then((db: IDBDatabase) => {
					validateBeforeTransaction(db, storeName, reject);
					const transaction = createTransaction(
							db,
							optionsGenerator(DBMode.readonly, storeName, reject, resolve)
						),
						objectStore = transaction.objectStore(storeName);
					const request = objectStore.get(+id);
					request.onsuccess = function(event: Event) {
						resolve((event.target as any).result as T);
						db.close();
					};
					request.onerror = function(e) {
						reject(e);
						db.close();
					};
				})
				.catch(err => reject(err));
		});
	}

	getAll<T>(storeName: string) {
		return new Promise<T[]>((resolve, reject) => {
			openDatabase(this.dbConfig.name, this.dbConfig.version, this.dbConfig)
				.then(db => {
					validateBeforeTransaction(db, storeName, reject);
					const transaction = createTransaction(
							db,
							optionsGenerator(DBMode.readonly, storeName, reject, resolve)
						),
						objectStore = transaction.objectStore(storeName),
						result: Array<any> = [];

					const request: IDBRequest = objectStore.getAll();

					request.onsuccess = function({ target: { result: ResultAll } }: RequestEvent<T>) {
						resolve(ResultAll as T[]);
						db.close();
					};
					request.onerror = function(e) {
						reject(e);
						db.close();
					};
				})
				.catch(err => reject(err));
		});
	}

	update<T>(storeName: string, value: T, key?: any) {
		return new Promise<any>((resolve, reject) => {
			openDatabase(this.dbConfig.name, this.dbConfig.version, this.dbConfig)
				.then(db => {
					validateBeforeTransaction(db, storeName, reject);
					const transaction = createTransaction(
							db,
							optionsGenerator(DBMode.readwrite, storeName, reject, resolve)
						),
						objectStore = transaction.objectStore(storeName);
					transaction.oncomplete = event => {
						resolve(event);
						db.close();
					};
					transaction.onerror = function(e) {
						reject(e);
						db.close();
					};
					if (key) {
						objectStore.put(value, key);
					} else {
						objectStore.put(value);
					}
				})
				.catch(err => reject(err));
		});
	}

	deleteRecord(storeName: string, key: Key) {
		return new Promise<any>((resolve, reject) => {
			openDatabase(this.dbConfig.name, this.dbConfig.version, this.dbConfig)
				.then(db => {
					validateBeforeTransaction(db, storeName, reject);
					const transaction = createTransaction(
							db,
							optionsGenerator(DBMode.readwrite, storeName, reject, resolve)
						),
						objectStore = transaction.objectStore(storeName);
					const request = objectStore.delete(key);
					request.onsuccess = event => {
						resolve(event);
						db.close();
					};
					request.onerror = function(e) {
						reject(e);
						db.close();
					};
				})
				.catch(err => reject(err));
		});
	}

	clear(storeName: string) {
		return new Promise<any>((resolve, reject) => {
			openDatabase(this.dbConfig.name, this.dbConfig.version, this.dbConfig)
				.then(db => {
					validateBeforeTransaction(db, storeName, reject);
					const transaction = createTransaction(
							db,
							optionsGenerator(DBMode.readwrite, storeName, reject, resolve)
						),
						objectStore = transaction.objectStore(storeName);
					objectStore.clear();
					transaction.oncomplete = event => {
						resolve();
						db.close();
					};
					transaction.onerror = function(e) {
						reject(e);
						db.close();
					};
				})
				.catch(err => reject(err));
		});
	}

	delete(storeName: string, key: any) {
		return new Promise<any>((resolve, reject) => {
			openDatabase(this.dbConfig.name, this.dbConfig.version, this.dbConfig)
				.then(db => {
					validateBeforeTransaction(db, storeName, reject);
					let transaction = createTransaction(
							db,
							optionsGenerator(DBMode.readwrite, storeName, reject, resolve)
						),
						objectStore = transaction.objectStore(storeName);
					const request = objectStore.delete(key);
					request.onsuccess = event => {
						resolve();
						db.close();
					};
					request.onerror = function(e) {
						reject(e);
						db.close();
					};
					db.close();
				})
				.catch(err => reject(err));
		});
	}

	deleteDatabase() {
		return new Promise(async (resolve, reject) => {
			const db = await openDatabase(this.dbConfig.name, this.dbConfig.version);
			db.close();
			const deleteDBRequest = this.indexedDB.deleteDatabase(this.dbConfig.name);
			deleteDBRequest.onsuccess = resolve;
			deleteDBRequest.onerror = reject;
			deleteDBRequest.onblocked = () => {
				throw new Error("Unable to delete database because it's blocked");
			};
		});
	}

	openCursor(storeName: string, cursorCallback: (event: Event) => void, keyRange?: IDBKeyRange) {
		return new Promise<void>((resolve, reject) => {
			openDatabase(this.dbConfig.name, this.dbConfig.version, this.dbConfig)
				.then(db => {
					validateBeforeTransaction(db, storeName, reject);
					const transaction = createTransaction(
							db,
							optionsGenerator(DBMode.readonly, storeName, reject, resolve)
						),
						objectStore = transaction.objectStore(storeName),
						request = objectStore.openCursor(keyRange);

					request.onsuccess = (event: Event) => {
						cursorCallback(event);
						resolve();
						db.close();
					};
					request.onerror = function(e) {
						reject(e);
						db.close();
					};
				})
				.catch(err => reject(err));
		});
	}

	getFirstByIndex(storeName: string, indexName: string, key: any) {
		return new Promise<any>((resolve, reject) => {
			openDatabase(this.dbConfig.name, this.dbConfig.version, this.dbConfig)
				.then(db => {
					validateBeforeTransaction(db, storeName, reject);
					const transaction = createTransaction(
							db,
							optionsGenerator(DBMode.readonly, storeName, reject, resolve)
						),
						objectStore = transaction.objectStore(storeName),
						index = objectStore.index(indexName),
						request = index.get(key);
					request.onsuccess = (event: Event) => {
						resolve((<IDBOpenDBRequest>event.target).result);
						db.close();
					};
					request.onerror = function(e) {
						reject(e);
						db.close();
					};
				})
				.catch(err => reject(err));
		});
	}

	getByIndex<T>(storeName: string, indexName: string, key: any): Promise<Array<T>> {
		return new Promise<any>((resolve, reject) => {
			const result: Array<T> = [];
			openDatabase(this.dbConfig.name, this.dbConfig.version, this.dbConfig)
				.then(db => {
					validateBeforeTransaction(db, storeName, reject);
					const transaction = createTransaction(
							db,
							optionsGenerator(DBMode.readonly, storeName, reject, resolve)
						),
						objectStore = transaction.objectStore(storeName),
						index = objectStore.index(indexName),
						request = index.openCursor(IDBKeyRange.only(key));
					request.onsuccess = (evt: any) => {
						const cursor = evt.target.result;
						if (cursor) {
							result.push(cursor.value as T);
							cursor.continue();
						} else {
							resolve(result);
							db.close();
						}
					};
					request.onerror = function(e) {
						reject(e);
						db.close();
					};
				})
				.catch(err => reject(err));
		});
	}

	count(storeName: string, keyRange?: IDBValidKey | IDBKeyRange) {
		return new Promise<any>((resolve, reject) => {
			openDatabase(this.dbConfig.name, this.dbConfig.version, this.dbConfig)
				.then(db => {
					validateBeforeTransaction(db, storeName, reject);
					let transaction = createTransaction(
							db,
							optionsGenerator(DBMode.readonly, storeName, reject, resolve)
						),
						objectStore = transaction.objectStore(storeName),
						request: IDBRequest;

					request = objectStore.count(keyRange);
					request.onsuccess = e => {
						resolve((<any>e.target).result);
						db.close();
					};
					request.onerror = function(e) {
						reject(e);
						db.close();
					};
				})
				.catch(err => reject(err));
		});
	}
}

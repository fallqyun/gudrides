
const DB_NAME = "BCGudridesBroadcastDB";
const DB_VERSION = 3;

const BCGDB = {

    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains("contacts")) {
                    const contactStore = db.createObjectStore("contacts", {
                        keyPath: "id",
                        autoIncrement: true
                    });

                    contactStore.createIndex("phone", "phone", {
                        unique: true
                    });

                    contactStore.createIndex("name", "name", {
                        unique: false
                    });
                }

                if (!db.objectStoreNames.contains("templates")) {
                    db.createObjectStore("templates", {
                        keyPath: "id"
                    });
                }

                if (!db.objectStoreNames.contains("history")) {
                    const historyStore = db.createObjectStore("history", {
                        keyPath: "id",
                        autoIncrement: true
                    });

                    historyStore.createIndex("phone", "phone", {
                        unique: false
                    });

                    historyStore.createIndex("createdAt", "createdAt", {
                        unique: false
                    });
                }
            };

            request.onsuccess = () => {
                const db = request.result;

                db.onversionchange = () => db.close();

                resolve(db);
            };

            request.onerror = () => reject(request.error);
        });
    },

    async getContacts() {
        const db = await this.openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction("contacts", "readonly");
            const request = transaction.objectStore("contacts").getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);

            transaction.oncomplete = () => db.close();
            transaction.onabort = () => db.close();
        });
    },

    async addContacts(contacts) {
        const db = await this.openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction("contacts", "readwrite");
            const store = transaction.objectStore("contacts");

            contacts.forEach(contact => store.add(contact));

            transaction.oncomplete = () => {
                db.close();
                resolve(true);
            };

            transaction.onerror = () => {
                db.close();
                reject(transaction.error);
            };

            transaction.onabort = () => {
                db.close();
                reject(transaction.error);
            };
        });
    },

    async countContacts() {
        const db = await this.openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction("contacts", "readonly");
            const request = transaction.objectStore("contacts").count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);

            transaction.oncomplete = () => db.close();
            transaction.onabort = () => db.close();
        });
    },

    async deleteContact(id) {
        const db = await this.openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction("contacts", "readwrite");

            transaction.objectStore("contacts").delete(id);

            transaction.oncomplete = () => {
                db.close();
                resolve(true);
            };

            transaction.onerror = () => {
                db.close();
                reject(transaction.error);
            };

            transaction.onabort = () => {
                db.close();
                reject(transaction.error);
            };
        });
    },

    async saveTemplate(template) {
        const db = await this.openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction("templates", "readwrite");

            transaction.objectStore("templates").put({
                id: "default",
                message: template.message,
                updatedAt: new Date().toISOString()
            });

            transaction.oncomplete = () => {
                db.close();
                resolve(true);
            };

            transaction.onerror = () => {
                db.close();
                reject(transaction.error);
            };

            transaction.onabort = () => {
                db.close();
                reject(transaction.error);
            };
        });
    },

    async getTemplate() {
        const db = await this.openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction("templates", "readonly");
            const request = transaction.objectStore("templates").get("default");

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);

            transaction.oncomplete = () => db.close();
            transaction.onabort = () => db.close();
        });
    },

    async addHistory(record) {
        const db = await this.openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction("history", "readwrite");

            transaction.objectStore("history").add({
                contactId: record.contactId ?? null,
                name: record.name || "Tanpa Nama",
                phone: record.phone,
                status: record.status,
                createdAt: new Date().toISOString()
            });

            transaction.oncomplete = () => {
                db.close();
                resolve(true);
            };

            transaction.onerror = () => {
                db.close();
                reject(transaction.error);
            };

            transaction.onabort = () => {
                db.close();
                reject(transaction.error);
            };
        });
    },

    async getHistory() {
        const db = await this.openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction("history", "readonly");
            const request = transaction.objectStore("history").getAll();

            request.onsuccess = () => {
                const records = request.result || [];

                records.sort((a, b) =>
                    new Date(b.createdAt) - new Date(a.createdAt)
                );

                resolve(records);
            };

            request.onerror = () => reject(request.error);

            transaction.oncomplete = () => db.close();
            transaction.onabort = () => db.close();
        });
    },

    async clearHistory() {
        const db = await this.openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction("history", "readwrite");

            transaction.objectStore("history").clear();

            transaction.oncomplete = () => {
                db.close();
                resolve(true);
            };

            transaction.onerror = () => {
                db.close();
                reject(transaction.error);
            };

            transaction.onabort = () => {
                db.close();
                reject(transaction.error);
            };
        });
    },

    // RESET SEMUA DATA APLIKASI
    async clearAllData() {
        const db = await this.openDB();

        return new Promise((resolve, reject) => {
            let settled = false;

            const transaction = db.transaction(
                ["contacts", "templates", "history"],
                "readwrite"
            );

            const finish = (callback, value) => {
                if (settled) return;

                settled = true;
                db.close();
                callback(value);
            };

            transaction.objectStore("contacts").clear();
            transaction.objectStore("templates").clear();
            transaction.objectStore("history").clear();

            transaction.oncomplete = () => {
                finish(resolve, true);
            };

            transaction.onerror = () => {
                finish(reject, transaction.error);
            };

            transaction.onabort = () => {
                finish(
                    reject,
                    transaction.error || new Error("Transaksi reset dibatalkan.")
                );
            };
        });
    }
};

window.BCGDB = BCGDB;


/* =========================================
   GUDRIDES APP
   REMINDER STORAGE - INDEXEDDB
   ========================================= */

const ReminderStorage = (() => {

    const DB_NAME = "GudridesReminderDB";
    const DB_VERSION = 1;

    const NEEDS_STORE = "needs";
    const ACTIVITY_STORE = "activities";

    let dbInstance = null;

    // =====================================
    // MEMBUKA DATABASE
    // =====================================

    function openDB() {
        return new Promise((resolve, reject) => {

            if (dbInstance) {
                resolve(dbInstance);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {

                const db = event.target.result;

                if (!db.objectStoreNames.contains(NEEDS_STORE)) {

                    const needsStore = db.createObjectStore(
                        NEEDS_STORE,
                        {
                            keyPath: "id",
                            autoIncrement: true
                        }
                    );

                    needsStore.createIndex(
                        "period",
                        "period",
                        { unique: false }
                    );

                    needsStore.createIndex(
                        "status",
                        "status",
                        { unique: false }
                    );

                    needsStore.createIndex(
                        "createdAt",
                        "createdAt",
                        { unique: false }
                    );
                }

                if (!db.objectStoreNames.contains(ACTIVITY_STORE)) {

                    db.createObjectStore(
                        ACTIVITY_STORE,
                        {
                            keyPath: "id",
                            autoIncrement: true
                        }
                    );
                }
            };

            request.onsuccess = (event) => {

                dbInstance = event.target.result;

                dbInstance.onclose = () => {
                    dbInstance = null;
                };

                resolve(dbInstance);
            };

            request.onerror = () => {
                reject(request.error);
            };

        });
    }

    // =====================================
    // TRANSACTION HELPER
    // =====================================

    async function runTransaction(storeName, mode, callback) {

        const db = await openDB();

        return new Promise((resolve, reject) => {

            const transaction = db.transaction(
                storeName,
                mode
            );

            const store = transaction.objectStore(storeName);

            let result;

            try {
                result = callback(store);
            } catch (error) {
                reject(error);
                return;
            }

            transaction.oncomplete = () => {
                resolve(result?.result);
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };

            transaction.onabort = () => {
                reject(
                    transaction.error ||
                    new Error("Transaksi dibatalkan.")
                );
            };

        });
    }

    // =====================================
    // HELPER HARGA
    // =====================================

    function calculateTotal(quantity, unitPrice) {

        return Number(quantity) * Number(unitPrice);
    }

    function validatePrice(price) {

        if (!Number.isFinite(price) || price < 0) {
            throw new Error("Harga satuan tidak valid.");
        }
    }

    // =====================================
    // HELPER TANGGAL PENGAJUAN
    // =====================================

    function getLocalDateKey(date = new Date()) {

        const year = date.getFullYear();

        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            date.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    // =====================================
    // MENAMBAHKAN KEBUTUHAN
    // =====================================

    async function addNeed(data) {

        const now = new Date().toISOString();

        const need = {
            name: String(data.name || "").trim(),

            quantity: Number(data.quantity || 1),

            unit: String(data.unit || "").trim(),

            unitPrice: Number(data.unitPrice ?? 0),

            description: String(
                data.description || ""
            ).trim(),

            period: Number(data.period),

            status: "pending",

            createdAt: now,
            updatedAt: now,

            submittedAt: null,
            submittedSnapshot: null
        };

        if (!need.name) {
            throw new Error("Nama kebutuhan wajib diisi.");
        }

        if (![1, 15].includes(need.period)) {
            throw new Error(
                "Periode harus tanggal 1 atau 15."
            );
        }

        if (
            !Number.isFinite(need.quantity) ||
            need.quantity <= 0
        ) {
            throw new Error("Jumlah kebutuhan tidak valid.");
        }

        validatePrice(need.unitPrice);

        const id = await runTransaction(
            NEEDS_STORE,
            "readwrite",
            store => store.add(need)
        );

        await addActivity({
            type: "created",
            needId: id,
            description: `Menambahkan kebutuhan: ${need.name}`
        });

        return id;
    }

    // =====================================
    // MENGAMBIL SEMUA KEBUTUHAN
    // =====================================

    async function getAllNeeds() {

        return runTransaction(
            NEEDS_STORE,
            "readonly",
            store => store.getAll()
        );
    }

    // =====================================
    // MENGAMBIL KEBUTUHAN BERDASARKAN ID
    // =====================================

    async function getNeedById(id) {

        return runTransaction(
            NEEDS_STORE,
            "readonly",
            store => store.get(Number(id))
        );
    }

    // =====================================
    // MENGAMBIL KEBUTUHAN BERDASARKAN PERIODE
    // =====================================

    async function getNeedsByPeriod(period) {

        const allNeeds = await getAllNeeds();

        return allNeeds.filter(
            item => item.period === Number(period)
        );
    }

    // =====================================
    // MENGEDIT KEBUTUHAN
    // =====================================

    async function updateNeed(id, data) {

        const existing = await getNeedById(id);

        if (!existing) {
            throw new Error(
                "Data kebutuhan tidak ditemukan."
            );
        }

        const updated = {
            ...existing,
            ...data,

            id: Number(id),

            name: String(
                data.name ?? existing.name
            ).trim(),

            quantity: Number(
                data.quantity ?? existing.quantity
            ),

            unit: String(
                data.unit ?? existing.unit
            ).trim(),

            unitPrice: Number(
                data.unitPrice ?? existing.unitPrice ?? 0
            ),

            description: String(
                data.description ?? existing.description
            ).trim(),

            period: Number(
                data.period ?? existing.period
            ),

            updatedAt: new Date().toISOString()
        };

        if (!updated.name) {
            throw new Error(
                "Nama kebutuhan wajib diisi."
            );
        }

        if (![1, 15].includes(updated.period)) {
            throw new Error(
                "Periode harus tanggal 1 atau 15."
            );
        }

        if (
            !Number.isFinite(updated.quantity) ||
            updated.quantity <= 0
        ) {
            throw new Error(
                "Jumlah kebutuhan tidak valid."
            );
        }

        validatePrice(updated.unitPrice);

        await runTransaction(
            NEEDS_STORE,
            "readwrite",
            store => store.put(updated)
        );

        await addActivity({
            type: "updated",
            needId: Number(id),
            description: `Memperbarui kebutuhan: ${updated.name}`
        });

        return updated;
    }

    // =====================================
    // MENANDAI KEBUTUHAN SUDAH DIAJUKAN
    // =====================================

    async function markAsSubmitted(id) {

        const existing = await getNeedById(id);

        if (!existing) {
            throw new Error(
                "Data kebutuhan tidak ditemukan."
            );
        }

        const now = new Date();

        const submittedAt = now.toISOString();

        const quantity = Number(existing.quantity);

        const unitPrice = Number(
            existing.unitPrice ?? 0
        );

        const totalCost = calculateTotal(
            quantity,
            unitPrice
        );

        // Snapshot biaya disimpan secara permanen
        // untuk menjaga riwayat pengajuan.

        const submittedSnapshot = {
            name: existing.name,
            quantity,
            unit: existing.unit,
            unitPrice,
            totalCost,
            period: Number(existing.period),
            submissionDate: getLocalDateKey(now),
            submittedAt
        };

        const updated = {
            ...existing,

            status: "submitted",

            submittedAt,
            submittedSnapshot,

            updatedAt: submittedAt
        };

        await runTransaction(
            NEEDS_STORE,
            "readwrite",
            store => store.put(updated)
        );

        // Simpan detail biaya ke riwayat aktivitas.

        await addActivity({
            type: "submitted",
            needId: Number(id),

            description: `Mengajukan kebutuhan: ${existing.name}`,

            period: Number(existing.period),

            quantity,
            unit: existing.unit,

            unitPrice,
            totalCost,

            submissionDate: submittedSnapshot.submissionDate
        });

        return updated;
    }

    // =====================================
    // MEMBATALKAN STATUS PENGAJUAN
    // =====================================

    async function markAsPending(id) {

        const existing = await getNeedById(id);

        if (!existing) {
            throw new Error(
                "Data kebutuhan tidak ditemukan."
            );
        }

        const now = new Date().toISOString();

        const updated = {
            ...existing,

            status: "pending",

            submittedAt: null,
            submittedSnapshot: null,

            updatedAt: now
        };

        await runTransaction(
            NEEDS_STORE,
            "readwrite",
            store => store.put(updated)
        );

        await addActivity({
            type: "reopened",
            needId: Number(id),
            description: `Mengembalikan status kebutuhan: ${existing.name}`
        });

        return updated;
    }

    // =====================================
    // MENGHAPUS KEBUTUHAN
    // =====================================

    async function deleteNeed(id) {

        const existing = await getNeedById(id);

        if (!existing) {
            throw new Error(
                "Data kebutuhan tidak ditemukan."
            );
        }

        await runTransaction(
            NEEDS_STORE,
            "readwrite",
            store => store.delete(Number(id))
        );

        await addActivity({
            type: "deleted",
            needId: Number(id),
            description: `Menghapus kebutuhan: ${existing.name}`
        });

        return true;
    }

    // =====================================
    // MENAMBAHKAN AKTIVITAS
    // =====================================

    async function addActivity(data) {

        const activity = {
            type: data.type || "info",

            needId: data.needId ?? null,

            description: data.description || "",

            createdAt: new Date().toISOString(),

            // Informasi tambahan untuk riwayat pengajuan.
            period: data.period ?? null,

            quantity: data.quantity ?? null,

            unit: data.unit ?? null,

            unitPrice: data.unitPrice ?? null,

            totalCost: data.totalCost ?? null,

            submissionDate: data.submissionDate ?? null
        };

        return runTransaction(
            ACTIVITY_STORE,
            "readwrite",
            store => store.add(activity)
        );
    }

    // =====================================
    // MENGAMBIL RIWAYAT AKTIVITAS
    // =====================================

    async function getActivities() {

        const activities = await runTransaction(
            ACTIVITY_STORE,
            "readonly",
            store => store.getAll()
        );

        return activities.sort(
            (a, b) =>
                new Date(b.createdAt) -
                new Date(a.createdAt)
        );
    }

    // =====================================
    // MENGHAPUS RIWAYAT PENGAJUAN
    // =====================================

    async function deleteSubmissionHistory(activityIds) {

        if (!Array.isArray(activityIds) || !activityIds.length) {
            throw new Error("ID riwayat pengajuan tidak valid.");
        }

        const ids = new Set(
            activityIds
                .map(Number)
                .filter(id => Number.isSafeInteger(id) && id > 0)
        );

        if (!ids.size) {
            throw new Error("Tidak ada ID riwayat yang valid.");
        }

        const db = await openDB();

        return new Promise((resolve, reject) => {

            const transaction = db.transaction(
                ACTIVITY_STORE,
                "readwrite"
            );

            const store = transaction.objectStore(ACTIVITY_STORE);

            let deletedCount = 0;

            const request = store.openCursor();

            request.onsuccess = (event) => {

                const cursor = event.target.result;

                if (!cursor) return;

                const activity = cursor.value;

                // Hanya hapus riwayat pengajuan yang ID-nya dipilih.
                // Aktivitas selain submitted tidak akan disentuh.

                if (
                    ids.has(Number(activity.id)) &&
                    activity.type === "submitted"
                ) {
                    cursor.delete();
                    deletedCount++;
                }

                cursor.continue();
            };

            request.onerror = () => {
                reject(request.error);
            };

            transaction.oncomplete = () => {
                resolve(deletedCount);
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };

            transaction.onabort = () => {
                reject(
                    transaction.error ||
                    new Error("Penghapusan riwayat dibatalkan.")
                );
            };

        });
    }

    // =====================================
    // MENGAMBIL RIWAYAT TOTAL PENGAJUAN
    // =====================================

    async function getSubmissionHistory() {

        const activities = await getActivities();

        const submissions = activities.filter(
            activity =>
                activity.type === "submitted" &&
                activity.submissionDate
        );

        const groupedHistory = {};

        submissions.forEach(activity => {

            const key =
                `${activity.submissionDate}_${activity.period}`;

            if (!groupedHistory[key]) {

                groupedHistory[key] = {
                    submissionDate: activity.submissionDate,

                    period: Number(activity.period),

                    totalCost: 0,

                    totalItems: 0,

                    items: []
                };
            }

            const history = groupedHistory[key];

            history.totalCost += Number(
                activity.totalCost || 0
            );

            history.totalItems += 1;

            history.items.push({
                needId: activity.needId,

                name: activity.description.replace(
                    "Mengajukan kebutuhan: ",
                    ""
                ),

                quantity: Number(activity.quantity || 0),

                unit: activity.unit || "",

                unitPrice: Number(
                    activity.unitPrice || 0
                ),

                totalCost: Number(
                    activity.totalCost || 0
                )
            });
        });

        return Object.values(groupedHistory).sort(
            (a, b) =>
                new Date(b.submissionDate) -
                new Date(a.submissionDate)
        );
    }

    // =====================================
    // MENGHAPUS SATU RIWAYAT AKTIVITAS
    // =====================================

    async function deleteActivity(id) {

        const activityId = Number(id);

        if (!Number.isSafeInteger(activityId) || activityId <= 0) {
            throw new Error("ID aktivitas tidak valid.");
        }

        const existing = await runTransaction(
            ACTIVITY_STORE,
            "readonly",
            store => store.get(activityId)
        );

        if (!existing) {
            throw new Error("Riwayat aktivitas tidak ditemukan.");
        }

        await runTransaction(
            ACTIVITY_STORE,
            "readwrite",
            store => store.delete(activityId)
        );

        return true;
    }

    // =====================================
    // STATISTIK KEBUTUHAN
    // =====================================

    async function getStatistics() {

        const needs = await getAllNeeds();

        return {
            total: needs.length,

            pending: needs.filter(
                item => item.status === "pending"
            ).length,

            submitted: needs.filter(
                item => item.status === "submitted"
            ).length,

            period1: needs.filter(
                item => item.period === 1
            ).length,

            period15: needs.filter(
                item => item.period === 15
            ).length
        };
    }

    // =====================================
    // PUBLIC API
    // =====================================

    return {
        openDB,

        addNeed,
        getAllNeeds,
        getNeedById,
        getNeedsByPeriod,
        updateNeed,

        markAsSubmitted,
        markAsPending,
        deleteNeed,

        addActivity,
        getActivities,
        getSubmissionHistory,
        deleteActivity,
        deleteSubmissionHistory,
        getStatistics,

        calculateTotal
    };

})();


document.addEventListener("DOMContentLoaded", async () => {
    // =========================================
    // GUDRIDES APP - REMINDER SYSTEM
    // =========================================

    const $ = (id) => document.getElementById(id);

    const needForm = $("needForm");
    const needIdInput = $("needId");
    const needNameInput = $("needName");
    const needQuantityInput = $("needQuantity");
    const needUnitInput = $("needUnit");
    const needUnitPriceInput = $("needUnitPrice");
    const needPriceSuffixInput = $("needPriceSuffix");
    const needCustomSuffixInput = $("needCustomSuffix");
    const needPeriodInput = $("needPeriod");
    const needDescriptionInput = $("needDescription");
    const needTotalPreview = $("needTotalPreview");

    const needsTableBody = $("needsTableBody");
    const period1TableBody = $("period1TableBody");
    const period15TableBody = $("period15TableBody");
    const historyTableBody = $("historyTableBody");
    const recentActivity = $("recentActivity");
    const submissionHistoryContainer = $("submissionHistoryContainer");

    const saveNeedButton = $("saveNeedButton");
    const resetNeedFormButton = $("resetNeedForm");

    let needs = [];
    let activities = [];

    // =========================================
    // FORMAT DATA
    // =========================================

    function formatCurrency(value) {
        const amount = Number(value) || 0;

        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }).format(amount);
    }

    function formatDate(value) {
        if (!value) return "-";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "-";

        return date.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    function formatDateTime(value) {
        if (!value) return "-";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "-";

        return date.toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function getQuantity(need) {
        return Number(need.quantity) || 0;
    }

    function getUnitPrice(need) {
        return Number(need.unitPrice) || 0;
    }

    function getSubtotal(need) {
        return getQuantity(need) * getUnitPrice(need);
    }

    function getPeriodLabel(period) {
        return String(period) === "1"
            ? "Tanggal 1"
            : "Tanggal 15";
    }

    function isSubmitted(need) {
        return need.status === "submitted";
    }

    // =========================================
    // HARGA SATUAN DENGAN AKHIRAN
    // =========================================

    function getMainPrice() {
        const raw = needUnitPriceInput.value.replace(/\D/g, "");
        return Number(raw) || 0;
    }

    function composeUnitPrice() {
        const mainPrice = getMainPrice();
        const suffix = needPriceSuffixInput.value;

        if (suffix === "0") {
            return mainPrice;
        }

        if (suffix === "500") {
            return (mainPrice * 1000) + 500;
        }

        if (suffix === "000") {
            return mainPrice * 1000;
        }

        if (suffix === "custom") {
            const customValue = needCustomSuffixInput.value.replace(/\D/g, "");

            if (customValue === "") {
                return null;
            }

            return (mainPrice * 1000) + Number(customValue);
        }

        return mainPrice * 1000;
    }

    function splitUnitPrice(price) {
        const amount = Math.max(0, Number(price) || 0);

        if (amount < 1000) {
            return {
                main: String(amount),
                suffix: "0",
                custom: ""
            };
        }

        const main = Math.floor(amount / 1000);
        const remainder = amount % 1000;

        if (remainder === 0) {
            return {
                main: String(main),
                suffix: "000",
                custom: ""
            };
        }

        if (remainder === 500) {
            return {
                main: String(main),
                suffix: "500",
                custom: ""
            };
        }

        return {
            main: String(main),
            suffix: "custom",
            custom: String(remainder).padStart(3, "0")
        };
    }

    function updateCustomSuffixVisibility() {
        const isCustom = needPriceSuffixInput.value === "custom";

        needCustomSuffixInput.hidden = !isCustom;
        needCustomSuffixInput.required = isCustom;

        if (!isCustom) {
            needCustomSuffixInput.value = "";
        }

        updatePricePreview();
    }

    function updatePricePreview() {
        if (!needTotalPreview) return;

        const quantity = Number(needQuantityInput.value) || 0;
        const unitPrice = composeUnitPrice();

        if (unitPrice === null) {
            needTotalPreview.textContent = "Masukkan akhiran nominal";
            return;
        }

        needTotalPreview.textContent = formatCurrency(quantity * unitPrice);
    }

    function validatePrice() {
        const mainValue = needUnitPriceInput.value.replace(/\D/g, "");

        if (mainValue === "") {
            alert("Harga satuan wajib diisi.");
            needUnitPriceInput.focus();
            return false;
        }

        if (needPriceSuffixInput.value === "custom") {
            const custom = needCustomSuffixInput.value.replace(/\D/g, "");

            if (custom === "" || Number(custom) > 999) {
                alert("Akhiran custom harus diisi dengan angka 0 sampai 999.");
                needCustomSuffixInput.focus();
                return false;
            }
        }

        const price = composeUnitPrice();

        if (price === null || !Number.isSafeInteger(price) || price < 0) {
            alert("Harga satuan tidak valid.");
            return false;
        }

        return true;
    }

    needUnitPriceInput.addEventListener("input", () => {
        needUnitPriceInput.value = needUnitPriceInput.value.replace(/\D/g, "");
        updatePricePreview();
    });

    needQuantityInput.addEventListener("input", updatePricePreview);

    needPriceSuffixInput.addEventListener("change", updateCustomSuffixVisibility);

    needCustomSuffixInput.addEventListener("input", () => {
        needCustomSuffixInput.value = needCustomSuffixInput.value
            .replace(/\D/g, "")
            .slice(0, 3);

        updatePricePreview();
    });

    // =========================================
    // LOAD DATABASE
    // =========================================

    async function loadData() {
        try {
            await ReminderStorage.openDB();

            const [needsData, activitiesData] = await Promise.all([
                ReminderStorage.getAllNeeds(),
                ReminderStorage.getActivities()
            ]);

            needs = Array.isArray(needsData) ? needsData : [];
            activities = Array.isArray(activitiesData) ? activitiesData : [];

            renderAll();
        } catch (error) {
            console.error("Gagal memuat data Reminder:", error);

            alert(
                "Data Reminder gagal dimuat. " +
                "Periksa file reminder-storage.js."
            );
        }
    }

    async function refreshData() {
        const [needsData, activitiesData] = await Promise.all([
            ReminderStorage.getAllNeeds(),
            ReminderStorage.getActivities()
        ]);

        needs = Array.isArray(needsData) ? needsData : [];
        activities = Array.isArray(activitiesData) ? activitiesData : [];

        renderAll();
    }

    // =========================================
    // FORM RESET
    // =========================================

    function resetForm() {
        needForm.reset();

        needIdInput.value = "";
        needQuantityInput.value = "1";
        needUnitPriceInput.value = "0";
        needPriceSuffixInput.value = "000";
        needCustomSuffixInput.value = "";
        needCustomSuffixInput.hidden = true;
        needCustomSuffixInput.required = false;
        needPeriodInput.value = "1";

        saveNeedButton.innerHTML =
            '<i data-lucide="save"></i> Simpan Kebutuhan';

        updatePricePreview();

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    if (resetNeedFormButton) {
        resetNeedFormButton.addEventListener("click", () => {
            setTimeout(resetForm, 0);
        });
    }

    // =========================================
    // SIMPAN KEBUTUHAN
    // =========================================

    needForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!validatePrice()) return;

        const name = needNameInput.value.trim();
        const quantity = Number(needQuantityInput.value);
        const unit = needUnitInput.value.trim();
        const unitPrice = composeUnitPrice();
        const period = needPeriodInput.value;
        const description = needDescriptionInput.value.trim();

        if (!name || !unit || !Number.isInteger(quantity) || quantity < 1) {
            alert("Lengkapi nama, jumlah, dan satuan dengan benar.");
            return;
        }

        const now = new Date().toISOString();

        const needData = {
            name,
            quantity,
            unit,
            unitPrice,
            description,
            period,
            updatedAt: now
        };

        try {
            const existingId = needIdInput.value;

            if (existingId) {
                const existingNeed = await ReminderStorage.getNeedById(
                    Number(existingId)
                );

                if (!existingNeed) {
                    alert("Data kebutuhan tidak ditemukan.");
                    return;
                }

                await ReminderStorage.updateNeed(
                    Number(existingId),
                    needData
                );

                alert("Kebutuhan berhasil diperbarui.");
            } else {
                await ReminderStorage.addNeed({
                    ...needData,
                    status: "pending",
                    createdAt: now
                });

                alert("Kebutuhan berhasil ditambahkan.");
            }

            resetForm();
            await refreshData();

        } catch (error) {
            console.error("Gagal menyimpan kebutuhan:", error);
            alert("Kebutuhan gagal disimpan. Silakan coba kembali.");
        }
    });

    // =========================================
    // EDIT KEBUTUHAN
    // =========================================

    async function editNeed(id) {
        try {
            const need = await ReminderStorage.getNeedById(Number(id));

            if (!need) {
                alert("Data kebutuhan tidak ditemukan.");
                return;
            }

            if (isSubmitted(need)) {
                alert(
                    "Kebutuhan yang sudah diajukan tidak dapat diedit. " +
                    "Ubah statusnya menjadi belum diajukan terlebih dahulu."
                );
                return;
            }

            needIdInput.value = need.id;
            needNameInput.value = need.name || "";
            needQuantityInput.value = need.quantity || 1;
            needUnitInput.value = need.unit || "";
            needPeriodInput.value = String(need.period || "1");
            needDescriptionInput.value = need.description || "";

            const priceParts = splitUnitPrice(need.unitPrice);

            needUnitPriceInput.value = priceParts.main;
            needPriceSuffixInput.value = priceParts.suffix;
            needCustomSuffixInput.value = priceParts.custom;

            updateCustomSuffixVisibility();
            updatePricePreview();

            saveNeedButton.innerHTML =
                '<i data-lucide="save"></i> Perbarui Kebutuhan';

            document.getElementById("data-kebutuhan").scrollIntoView({
                behavior: "smooth"
            });

            if (window.lucide) {
                lucide.createIcons();
            }

        } catch (error) {
            console.error(error);
            alert("Gagal mengambil data kebutuhan.");
        }
    }

    // =========================================
    // HAPUS KEBUTUHAN
    // =========================================

    async function deleteNeed(id) {
        const confirmed = confirm(
            "Apakah kamu yakin ingin menghapus kebutuhan ini?"
        );

        if (!confirmed) return;

        try {
            await ReminderStorage.deleteNeed(Number(id));
            await refreshData();

            alert("Kebutuhan berhasil dihapus.");
        } catch (error) {
            console.error(error);
            alert("Kebutuhan gagal dihapus.");
        }
    }

    // =========================================
    // UBAH STATUS
    // =========================================

    async function markPending(id) {
        const confirmed = confirm(
            "Ubah status kebutuhan menjadi Belum Diajukan?"
        );

        if (!confirmed) return;

        try {
            await ReminderStorage.markAsPending(Number(id));
            await refreshData();
        } catch (error) {
            console.error(error);
            alert("Gagal mengubah status kebutuhan.");
        }
    }

    async function markSubmitted(id) {
        const confirmed = confirm(
            "Tandai kebutuhan ini sebagai Sudah Diajukan?"
        );

        if (!confirmed) return;

        try {
            await ReminderStorage.markAsSubmitted(Number(id));
            await refreshData();

            alert("Kebutuhan berhasil ditandai sudah diajukan.");
        } catch (error) {
            console.error(error);
            alert("Gagal memperbarui status pengajuan.");
        }
    }

    // =========================================
    // EVENT TOMBOL TABEL
    // =========================================

    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action]");

        if (!button) return;

        const action = button.dataset.action;

        // HAPUS RIWAYAT PENGAJUAN
        // Menggunakan data-ids untuk menghapus satu kelompok pengajuan.

        if (action === "delete-submission-history") {
            const ids = button.dataset.ids || "";
            deleteSubmissionHistory(ids);
            return;
        }

        // HAPUS SATU RIWAYAT AKTIVITAS
        // Menggunakan data-id untuk menghapus satu baris aktivitas.

        if (action === "delete-activity") {
            const id = button.dataset.id;

            if (!id) return;

            deleteActivity(id);
            return;
        }

        const id = button.dataset.id;

        if (!id) return;

        if (action === "edit") {
            editNeed(id);
        }

        if (action === "delete") {
            deleteNeed(id);
        }

        if (action === "submit") {
            markSubmitted(id);
        }

        if (action === "pending") {
            markPending(id);
        }
    });

    // =========================================
    // STATUS BADGE
    // =========================================

    function renderStatus(need) {
        if (isSubmitted(need)) {
            return '<span class="status-badge status-success">Sudah Diajukan</span>';
        }

        return '<span class="status-badge status-pending">Belum Diajukan</span>';
    }

    // =========================================
    // EMPTY TABLE
    // =========================================

    function showEmptyRow(tbody, colspan, message) {
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="empty-state">
                    ${escapeHTML(message)}
                </td>
            </tr>
        `;
    }

    // =========================================
    // RENDER BARIS KEBUTUHAN
    // =========================================

    function createNeedRow(need, index, mode = "all") {
        const subtotal = getSubtotal(need);
        const name = escapeHTML(need.name);
        const unit = escapeHTML(need.unit || "");
        const description = escapeHTML(need.description || "-");

        const actionButtons = isSubmitted(need)
            ? `
                <button
                    type="button"
                    class="action-btn edit-btn"
                    data-action="pending"
                    data-id="${need.id}"
                    title="Ubah menjadi belum diajukan"
                >
                    <i data-lucide="undo-2"></i>
                </button>
            `
            : `
                <button
                    type="button"
                    class="action-btn status-btn"
                    data-action="submit"
                    data-id="${need.id}"
                    title="Tandai sudah diajukan"
                >
                    <i data-lucide="check"></i>
                </button>

                <button
                    type="button"
                    class="action-btn edit-btn"
                    data-action="edit"
                    data-id="${need.id}"
                    title="Edit kebutuhan"
                >
                    <i data-lucide="pencil"></i>
                </button>

                <button
                    type="button"
                    class="action-btn delete-btn"
                    data-action="delete"
                    data-id="${need.id}"
                    title="Hapus kebutuhan"
                >
                    <i data-lucide="trash-2"></i>
                </button>
            `;

        const periodCell = `
            <td>
                <span class="period-badge">
                    ${getPeriodLabel(need.period)}
                </span>
            </td>
        `;

        const descriptionCell = `
            <td>${description}</td>
        `;

        const actionCell = `
            <td>
                <div class="table-actions">
                    ${actionButtons}
                </div>
            </td>
        `;

        if (mode === "all") {
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <strong>${name}</strong>
                    </td>
                    <td>${getQuantity(need)} ${unit}</td>
                    <td>${formatCurrency(getUnitPrice(need))}</td>
                    <td><strong>${formatCurrency(subtotal)}</strong></td>
                    ${periodCell}
                    <td>${renderStatus(need)}</td>
                    ${actionCell}
                </tr>
            `;
        }

        return `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <strong>${name}</strong>
                </td>
                <td>${getQuantity(need)} ${unit}</td>
                <td>${formatCurrency(getUnitPrice(need))}</td>
                <td><strong>${formatCurrency(subtotal)}</strong></td>
                ${descriptionCell}
                <td>${renderStatus(need)}</td>
                ${actionCell}
            </tr>
        `;
    }

    // =========================================
    // RENDER SEMUA KEBUTUHAN
    // =========================================

    function renderNeedsTable() {
        const sortedNeeds = [...needs].sort((a, b) => {
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

        if (!sortedNeeds.length) {
            showEmptyRow(
                needsTableBody,
                8,
                "Belum ada data kebutuhan."
            );
            return;
        }

        needsTableBody.innerHTML = sortedNeeds
            .map((need, index) => createNeedRow(need, index, "all"))
            .join("");
    }

    // =========================================
    // RENDER PERIODE TANGGAL 1 DAN 15
    // =========================================

    function renderPeriodTables() {
        const period1Needs = needs.filter(
            need => String(need.period) === "1"
        );

        const period15Needs = needs.filter(
            need => String(need.period) === "15"
        );

        if (!period1Needs.length) {
            showEmptyRow(
                period1TableBody,
                8,
                "Belum ada kebutuhan untuk periode tanggal 1."
            );
        } else {
            period1TableBody.innerHTML = period1Needs
                .map((need, index) => createNeedRow(need, index, "period"))
                .join("");
        }

        if (!period15Needs.length) {
            showEmptyRow(
                period15TableBody,
                8,
                "Belum ada kebutuhan untuk periode tanggal 15."
            );
        } else {
            period15TableBody.innerHTML = period15Needs
                .map((need, index) => createNeedRow(need, index, "period"))
                .join("");
        }

        const totalPeriod1 = period1Needs.reduce(
            (total, need) => total + getSubtotal(need),
            0
        );

        const totalPeriod15 = period15Needs.reduce(
            (total, need) => total + getSubtotal(need),
            0
        );

        $("period1Total").textContent = formatCurrency(totalPeriod1);
        $("period15Total").textContent = formatCurrency(totalPeriod15);
    }

    // =========================================
    // DASHBOARD STATISTICS
    // =========================================

    function getNextSubmissionDate() {
        const now = new Date();

        const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );

        let candidate;

        if (today.getDate() < 1) {
            candidate = new Date(today.getFullYear(), today.getMonth(), 1);
        } else if (today.getDate() < 15) {
            candidate = new Date(today.getFullYear(), today.getMonth(), 15);
        } else {
            candidate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        }

        return candidate;
    }

    function renderStatistics() {
        const total = needs.length;
        const submitted = needs.filter(isSubmitted).length;
        const pending = total - submitted;

        $("totalKebutuhan").textContent = total;
        $("belumDiajukan").textContent = pending;
        $("sudahDiajukan").textContent = submitted;

        const period1Count = needs.filter(
            need => String(need.period) === "1"
        ).length;

        const period15Count = needs.filter(
            need => String(need.period) === "15"
        ).length;

        $("jumlahTanggal1").textContent = period1Count;
        $("jumlahTanggal15").textContent = period15Count;

        const nextDate = getNextSubmissionDate();

        $("periodeBerikutnya").textContent =
            nextDate.getDate() === 1 ? "Tanggal 1" : "Tanggal 15";

        $("tanggalPeriode").textContent = formatDate(nextDate);
    }

    // =========================================
    // ACTIVITY HISTORY
    // =========================================

    function getActivityDescription(activity) {
        if (activity.message) return activity.message;
        if (activity.description) return activity.description;

        const type = String(activity.type || activity.action || "").toLowerCase();

        if (type.includes("submitted")) {
            return `Mengajukan kebutuhan: ${activity.needName || activity.itemName || "-"}`;
        }

        if (type.includes("pending")) {
            return `Mengubah status kebutuhan: ${activity.needName || activity.itemName || "-"}`;
        }

        if (type.includes("deleted")) {
            return `Menghapus kebutuhan: ${activity.needName || activity.itemName || "-"}`;
        }

        if (type.includes("updated")) {
            return `Memperbarui kebutuhan: ${activity.needName || activity.itemName || "-"}`;
        }

        if (type.includes("added")) {
            return `Menambahkan kebutuhan: ${activity.needName || activity.itemName || "-"}`;
        }

        return activity.needName || activity.itemName || "Aktivitas Reminder";
    }

    function isSubmissionActivity(activity) {
        const type = String(activity.type || activity.action || "").toLowerCase();

        return type.includes("submitted");
    }

    function getActivityTime(activity) {
        return activity.createdAt ||
            activity.submittedAt ||
            activity.updatedAt ||
            activity.timestamp ||
            null;
    }

    function getActivityCost(activity) {
        if (activity.totalCost !== undefined && activity.totalCost !== null) {
            return Number(activity.totalCost);
        }

        return null;
    }

    function renderHistory() {
        const sortedActivities = [...activities].sort((a, b) => {
            return new Date(getActivityTime(b) || 0) -
                new Date(getActivityTime(a) || 0);
        });

        if (!sortedActivities.length) {
            showEmptyRow(
                historyTableBody,
                5,
                "Belum ada riwayat aktivitas."
            );
            return;
        }

        historyTableBody.innerHTML = sortedActivities.map(
            (activity, index) => {
                const description = escapeHTML(
                    getActivityDescription(activity)
                );

                const time = formatDateTime(getActivityTime(activity));
                const cost = isSubmissionActivity(activity)
                    ? getActivityCost(activity)
                    : null;

                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${description}</td>
                        <td>${time}</td>
                        <td>
                            ${cost === null
                                ? "-"
                                : formatCurrency(cost)}
                        </td>
                        <td>
                            <div class="table-actions">
                                <button
                                    type="button"
                                    class="action-btn delete-btn"
                                    data-action="delete-activity"
                                    data-id="${Number(activity.id)}"
                                    title="Hapus riwayat aktivitas"
                                >
                                    <i data-lucide="trash-2"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }
        ).join("");
    }

    // =========================================
    // HAPUS SATU RIWAYAT AKTIVITAS
    // =========================================

    async function deleteActivity(id) {
        const activityId = Number(id);

        if (!Number.isSafeInteger(activityId) || activityId <= 0) {
            alert("ID aktivitas tidak valid.");
            return;
        }

        const confirmed = confirm(
            "Apakah kamu yakin ingin menghapus aktivitas ini?\n\n" +
            "Jika aktivitas ini merupakan pengajuan, catatannya juga akan " +
            "hilang dari Rekap Pengajuan.\n\n" +
            "Data kebutuhan dan status pengajuan tidak akan berubah."
        );

        if (!confirmed) return;

        try {
            await ReminderStorage.deleteActivity(activityId);

            await refreshData();

            alert("Riwayat aktivitas berhasil dihapus.");

        } catch (error) {
            console.error("Gagal menghapus riwayat aktivitas:", error);
            alert(
                error.message ||
                "Terjadi kesalahan saat menghapus riwayat aktivitas."
            );
        }
    }

    // =========================================
    // REKAP PENGAJUAN BERDASARKAN PERIODE
    // =========================================

    function renderSubmissionHistory() {
        const submissions = activities.filter(isSubmissionActivity);

        if (!submissions.length) {
            submissionHistoryContainer.innerHTML = `
                <div class="empty-state">
                    Belum ada data pengajuan.
                </div>
            `;
            return;
        }

        const groups = {};

        submissions.forEach(activity => {
            const time = getActivityTime(activity);
            const date = time
                ? new Date(time).toLocaleDateString("id-ID")
                : "Tanggal tidak diketahui";

            const period = String(activity.period || "-");
            const key = `${date}-${period}`;

            if (!groups[key]) {
                groups[key] = {
                    date,
                    period,
                    items: [],
                    activityIds: [],
                    total: 0,
                    missingCost: false
                };
            }

            groups[key].activityIds.push(activity.id);

            const itemName = activity.needName ||
                activity.itemName ||
                "Kebutuhan";

            const quantity = Number(activity.quantity) || 0;
            const unitPrice = activity.unitPrice !== undefined
                ? Number(activity.unitPrice)
                : null;

            const totalCost = getActivityCost(activity);

            groups[key].items.push({
                name: itemName,
                quantity,
                unitPrice,
                totalCost
            });

            if (totalCost === null) {
                groups[key].missingCost = true;
            } else {
                groups[key].total += totalCost;
            }
        });

        submissionHistoryContainer.innerHTML = `
            <div class="table-card">
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>No.</th>
                                <th>Tanggal Pengajuan</th>
                                <th>Periode</th>
                                <th>Jumlah Item</th>
                                <th>Rincian Kebutuhan</th>
                                <th>Total Biaya</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.values(groups).map((group, index) => {
                                const details = group.items.map(item => {
                                    return `
                                        <div class="history-item">
                                            <strong>${escapeHTML(item.name)}</strong>
                                            <small>
                                                ${item.quantity} item
                                                ${item.unitPrice === null
                                                    ? ""
                                                    : ` · ${formatCurrency(item.unitPrice)}`}
                                            </small>
                                        </div>
                                    `;
                                }).join("");

                                const totalLabel = group.missingCost
                                    ? `${formatCurrency(group.total)} (Sebagian data harga belum tercatat)`
                                    : formatCurrency(group.total);

                                const activityIds = group.activityIds.join(",");

                                return `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td>${escapeHTML(group.date)}</td>
                                        <td>${escapeHTML(getPeriodLabel(group.period))}</td>
                                        <td>${group.items.length}</td>
                                        <td>${details}</td>
                                        <td><strong>${totalLabel}</strong></td>
                                        <td>
                                            <button
                                                type="button"
                                                class="btn btn-danger btn-sm"
                                                data-action="delete-submission-history"
                                                data-ids="${activityIds}"
                                            >
                                                <i class="fas fa-trash"></i>
                                                Hapus
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // =========================================
    // HAPUS RIWAYAT PENGAJUAN
    // =========================================

    async function deleteSubmissionHistory(ids) {
        const activityIds = ids
            .split(",")
            .map(Number)
            .filter(id => Number.isSafeInteger(id) && id > 0);

        if (!activityIds.length) {
            alert("Data riwayat tidak valid.");
            return;
        }

        const confirmed = confirm(
            "Apakah kamu yakin ingin menghapus riwayat pengajuan ini?\n\n" +
            "Data kebutuhan dan status pengajuan tidak akan berubah."
        );

        if (!confirmed) return;

        try {
            const deletedCount =
                await ReminderStorage.deleteSubmissionHistory(activityIds);

            await refreshData();

            if (deletedCount > 0) {
                alert("Riwayat pengajuan berhasil dihapus.");
            } else {
                alert("Tidak ada riwayat yang dapat dihapus.");
            }

        } catch (error) {
            console.error("Gagal menghapus riwayat pengajuan:", error);
            alert("Terjadi kesalahan saat menghapus riwayat pengajuan.");
        }
    }

    // =========================================
    // RECENT ACTIVITY
    // =========================================

    function renderRecentActivity() {
        const sortedActivities = [...activities].sort((a, b) => {
            return new Date(getActivityTime(b) || 0) -
                new Date(getActivityTime(a) || 0);
        }).slice(0, 5);

        if (!sortedActivities.length) {
            showEmptyRow(
                recentActivity,
                2,
                "Belum ada aktivitas."
            );
            return;
        }

        recentActivity.innerHTML = sortedActivities.map(activity => {
            return `
                <tr>
                    <td>${escapeHTML(getActivityDescription(activity))}</td>
                    <td>${formatDateTime(getActivityTime(activity))}</td>
                </tr>
            `;
        }).join("");
    }

    // =========================================
    // RENDER ALL
    // =========================================

    function renderAll() {
        renderNeedsTable();
        renderPeriodTables();
        renderStatistics();
        renderHistory();
        renderSubmissionHistory();
        renderRecentActivity();

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // =========================================
    // NOTIFICATION REMINDER
    // =========================================

    function getUpcomingPeriods() {
        const now = new Date();

        const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );

        const candidates = [
            new Date(now.getFullYear(), now.getMonth(), 1),
            new Date(now.getFullYear(), now.getMonth(), 15),
            new Date(now.getFullYear(), now.getMonth() + 1, 1),
            new Date(now.getFullYear(), now.getMonth() + 1, 15)
        ];

        return candidates.filter(date => date >= today);
    }

    function checkReminderNotifications() {
        if (!("Notification" in window)) return;
        if (Notification.permission !== "granted") return;

        const today = new Date();

        const todayStart = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        );

        const upcomingPeriods = getUpcomingPeriods();

        upcomingPeriods.forEach(periodDate => {
            const difference = Math.round(
                (periodDate - todayStart) / (1000 * 60 * 60 * 24)
            );

            if (difference !== 3 && difference !== 0) return;

            const period = String(periodDate.getDate());

            const pendingNeeds = needs.filter(need => {
                return String(need.period) === period &&
                    !isSubmitted(need);
            });

            if (!pendingNeeds.length) return;

            const dateKey = [
                "gudrides-reminder",
                periodDate.getFullYear(),
                periodDate.getMonth() + 1,
                periodDate.getDate(),
                difference
            ].join("-");

            if (localStorage.getItem(dateKey)) return;

            const title = difference === 0
                ? "Pengajuan Kebutuhan Hari Ini"
                : "Pengingat Pengajuan Kebutuhan";

            const message = difference === 0
                ? `${pendingNeeds.length} kebutuhan masih belum diajukan untuk periode tanggal ${period}.`
                : `Tersisa 3 hari menuju pengajuan tanggal ${period}. Ada ${pendingNeeds.length} kebutuhan yang belum diajukan.`;

            new Notification(title, {
                body: message,
                icon: "https://cdn-icons-png.flaticon.com/512/1827/1827347.png"
            });

            localStorage.setItem(dateKey, "sent");
        });
    }

    // =========================================
    // NAVIGASI MENU
    // =========================================

    function setupNavigation() {
        const menuLinks = document.querySelectorAll(
            '.sidebar-menu a[href^="#"]'
        );

        const reminderMenu = document.querySelector(
            ".menu-group > .menu-item"
        );

        const sections = [
            "dashboard-reminder",
            "data-kebutuhan",
            "pengajuan-tanggal-1",
            "pengajuan-tanggal-15",
            "riwayat"
        ];

        if (!menuLinks.length) return;

        function showSection(targetId) {
            sections.forEach(sectionId => {
                const section = $(sectionId);

                if (!section) return;

                section.style.display =
                    sectionId === targetId ? "block" : "none";
            });

            menuLinks.forEach(link => {
                const isActive =
                    link.getAttribute("href") === `#${targetId}`;

                link.classList.toggle("active", isActive);
            });

            if (reminderMenu) {
                reminderMenu.classList.add("active");
            }

            if (window.lucide) {
                lucide.createIcons();
            }
        }

        menuLinks.forEach(link => {
            link.addEventListener("click", event => {
                const targetId = link.getAttribute("href").slice(1);

                if (!$(targetId)) return;

                event.preventDefault();

                showSection(targetId);

                history.replaceState(
                    null,
                    "",
                    `#${targetId}`
                );
            });
        });

        const initialId = location.hash.slice(1);

        const validInitialSection =
            initialId && sections.includes(initialId)
                ? initialId
                : "dashboard-reminder";

        showSection(validInitialSection);
    }

    // =========================================
    // START APPLICATION
    // =========================================

    setupNavigation();

    await loadData();

    checkReminderNotifications();

    updatePricePreview();

    // =========================================
    // NOTIFICATION PERMISSION
    // =========================================

    if (
        "Notification" in window &&
        Notification.permission === "default"
    ) {
        console.info(
            "Izin notifikasi belum diberikan. " +
            "Pengingat browser aktif jika izin notifikasi sudah diberikan."
        );
    }
});

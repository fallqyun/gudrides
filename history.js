
/* =========================================
   GUDRIDES APP
   BROADCAST HISTORY
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.getElementById("historyTableBody");
    const filter = document.getElementById("historyFilter");
    const refreshButton = document.getElementById("refreshHistory");
    const clearButton = document.getElementById("clearHistoryButton");

    const totalElement = document.getElementById("historyTotal");
    const sentElement = document.getElementById("historySent");
    const failedElement = document.getElementById("historyFailed");
    const countLabel = document.getElementById("historyCountLabel");

    if (!tableBody) return;

    let allHistory = [];

    /* =========================================
       FORMAT DATE
    ========================================= */

    function formatDate(dateString) {
        if (!dateString) return "-";

        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return new Intl.DateTimeFormat("id-ID", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);
    }


    /* =========================================
       RENDER HISTORY
    ========================================= */

    function renderHistory() {
        const selectedFilter = filter?.value || "all";

        const filteredHistory = allHistory.filter(record => {
            return selectedFilter === "all" ||
                record.status === selectedFilter;
        });

        const totalSent = allHistory.filter(
            record => record.status === "sent"
        ).length;

        const totalFailed = allHistory.filter(
            record => record.status === "failed"
        ).length;

        if (totalElement) {
            totalElement.textContent = allHistory.length;
        }

        if (sentElement) {
            sentElement.textContent = totalSent;
        }

        if (failedElement) {
            failedElement.textContent = totalFailed;
        }

        if (countLabel) {
            countLabel.textContent =
                `Menampilkan ${filteredHistory.length} dari ${allHistory.length} riwayat`;
        }

        if (filteredHistory.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="history-empty-cell">
                        Belum ada riwayat untuk ditampilkan.
                    </td>
                </tr>
            `;

            return;
        }

        tableBody.replaceChildren();

        filteredHistory.forEach((record, index) => {
            const row = document.createElement("tr");

            const values = [
                String(index + 1),
                record.name || "Tanpa Nama",
                record.phone || "-",
                record.status === "sent"
                    ? "Berhasil Dikirim"
                    : "Gagal",
                formatDate(record.createdAt)
            ];

            values.forEach((value, cellIndex) => {
                const cell = document.createElement("td");

                if (cellIndex === 3) {
                    const badge = document.createElement("span");

                    badge.className =
                        `history-status ${record.status}`;

                    badge.textContent = value;

                    cell.appendChild(badge);
                } else {
                    cell.textContent = value;
                }

                row.appendChild(cell);
            });

            tableBody.appendChild(row);
        });
    }


    /* =========================================
       UPDATE DASHBOARD STATISTICS
    ========================================= */

    async function updateDashboardHistoryStats() {
        const contacts = await BCGDB.getContacts();
        const history = await BCGDB.getHistory();

        // Ambil status terbaru setiap nomor HP.
        // getHistory() sudah mengurutkan data terbaru lebih dulu.
        const latestStatusByPhone = new Map();

        history.forEach(record => {
            if (!record.phone) return;

            if (!latestStatusByPhone.has(record.phone)) {
                latestStatusByPhone.set(
                    record.phone,
                    record.status
                );
            }
        });

        const totalSent = [...latestStatusByPhone.values()]
            .filter(status => status === "sent")
            .length;

        const totalPending = Math.max(
            0,
            contacts.length - totalSent
        );

        const sentDashboard = document.getElementById("totalSent");
        const pendingDashboard = document.getElementById("totalPending");

        if (sentDashboard) {
            sentDashboard.textContent = totalSent;
        }

        if (pendingDashboard) {
            pendingDashboard.textContent = totalPending;
        }
    }


    /* =========================================
       LOAD HISTORY
    ========================================= */

    async function loadHistory() {
        try {
            allHistory = await BCGDB.getHistory();

            renderHistory();

            await updateDashboardHistoryStats();

        } catch (error) {
            console.error("Gagal memuat riwayat:", error);

            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="history-empty-cell">
                        Gagal memuat riwayat.
                    </td>
                </tr>
            `;
        }
    }


    /* =========================================
       FILTER HISTORY
    ========================================= */

    if (filter) {
        filter.addEventListener("change", renderHistory);
    }


    /* =========================================
       REFRESH HISTORY
    ========================================= */

    if (refreshButton) {
        refreshButton.addEventListener("click", loadHistory);
    }


    /* =========================================
       CLEAR HISTORY
    ========================================= */

    if (clearButton) {
        clearButton.addEventListener("click", async () => {
            const confirmed = confirm(
                "Apakah kamu yakin ingin menghapus seluruh riwayat broadcast? Data kontak dan template tidak akan dihapus."
            );

            if (!confirmed) return;

            clearButton.disabled = true;

            try {
                await BCGDB.clearHistory();

                await loadHistory();

                alert("Seluruh riwayat broadcast berhasil dihapus.");

            } catch (error) {
                console.error("Gagal menghapus riwayat:", error);

                alert("Riwayat gagal dihapus.");

            } finally {
                clearButton.disabled = false;
            }
        });
    }


    /* =========================================
       GLOBAL REFRESH FUNCTION
    ========================================= */

    // Dapat dipanggil setelah pencatatan dari Broadcast Center.
    window.refreshBroadcastHistory = loadHistory;


    /* =========================================
       INITIALIZATION
    ========================================= */

    loadHistory();
});

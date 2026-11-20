
/* =========================================
   GUDRIDES APP
   DATABASE SETTINGS
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    const resetButton = document.getElementById("resetDatabaseButton");

    const contactCount = document.getElementById("settingsContactCount");
    const historyCount = document.getElementById("settingsHistoryCount");
    const templateStatus = document.getElementById("settingsTemplateStatus");
    const status = document.getElementById("settingsStatus");


    /* =========================================
       STATUS MESSAGE
    ========================================= */

    function showSettingsStatus(message, type = "") {
        if (!status) return;

        status.textContent = message;
        status.className = `import-status ${type}`;
    }


    /* =========================================
       REFRESH DATABASE SUMMARY
    ========================================= */

    async function refreshSettingsSummary() {
        try {
            const contacts = await BCGDB.getContacts();
            const history = await BCGDB.getHistory();
            const template = await BCGDB.getTemplate();

            if (contactCount) {
                contactCount.textContent = contacts.length;
            }

            if (historyCount) {
                historyCount.textContent = history.length;
            }

            if (templateStatus) {
                templateStatus.textContent =
                    template?.message?.trim()
                        ? "Tersimpan"
                        : "Belum ada";
            }

        } catch (error) {
            console.error("Gagal membaca database:", error);

            showSettingsStatus(
                "Gagal membaca database.",
                "error"
            );
        }
    }


    /* =========================================
       RESET DATABASE
    ========================================= */

    if (resetButton) {
        resetButton.addEventListener("click", async () => {

            // Konfirmasi pertama.
            const firstConfirm = confirm(
                "Apakah kamu yakin ingin menghapus seluruh kontak, template pesan, dan riwayat broadcast?"
            );

            if (!firstConfirm) return;

            // Konfirmasi kedua.
            const secondConfirm = confirm(
                "PERINGATAN TERAKHIR!\n\nSemua data akan dihapus permanen dari browser ini.\n\nApakah kamu benar-benar ingin melanjutkan?"
            );

            if (!secondConfirm) return;

            resetButton.disabled = true;
            resetButton.textContent = "Menghapus Data...";

            showSettingsStatus(
                "Sedang menghapus seluruh data...",
                ""
            );

            try {
                // Hapus seluruh data aplikasi.
                await BCGDB.clearAllData();

                // Verifikasi hasil penghapusan.
                const contacts = await BCGDB.getContacts();
                const history = await BCGDB.getHistory();
                const template = await BCGDB.getTemplate();

                if (
                    contacts.length !== 0 ||
                    history.length !== 0 ||
                    template !== null
                ) {
                    throw new Error(
                        "Verifikasi gagal: masih ada data yang tersimpan."
                    );
                }

                alert(
                    "Berhasil! Seluruh data aplikasi telah direset."
                );

                window.location.reload();

            } catch (error) {
                console.error("Reset database gagal:", error);

                showSettingsStatus(
                    "Reset gagal. " + error.message,
                    "error"
                );

                resetButton.disabled = false;
                resetButton.textContent = "Reset Semua Data";
            }
        });
    }


    /* =========================================
       INITIALIZATION
    ========================================= */

    refreshSettingsSummary();
});

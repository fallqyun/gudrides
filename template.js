
document.addEventListener("DOMContentLoaded", async () => {
    const messageInput = document.getElementById("templateMessage");
    const saveButton = document.getElementById("saveTemplateButton");
    const status = document.getElementById("templateStatus");

    const previewMessage = document.getElementById("previewMessage");
    const previewContactName = document.getElementById("previewContactName");

    let previewName = "Contoh Kontak";

    function showStatus(message, type = "success") {
        if (!status) return;

        status.textContent = message;
        status.className = `import-status ${type}`;
    }

    function updateMessagePreview() {
        if (!messageInput || !previewMessage) return;

        const originalMessage = messageInput.value;

        const personalizedMessage = originalMessage.replace(
            /{{\s*nama\s*}}/gi,
            previewName
        );

        previewMessage.textContent =
            personalizedMessage || "Pesan kamu akan muncul di sini.";
    }

    async function loadPreviewContact() {
        try {
            const contacts = await BCGDB.getContacts();

            if (contacts.length > 0) {
                previewName = contacts[0].name || "Kontak";
            }

            if (previewContactName) {
                previewContactName.textContent = previewName;
            }

            updateMessagePreview();

        } catch (error) {
            console.error("Gagal mengambil kontak untuk preview:", error);
        }
    }

    async function loadSavedTemplate() {
        try {
            const template = await BCGDB.getTemplate();

            if (template && messageInput) {
                messageInput.value = template.message || "";
            }

            updateMessagePreview();

        } catch (error) {
            console.error("Gagal memuat template:", error);
            showStatus("Gagal memuat template tersimpan.", "error");
        }
    }

    if (messageInput) {
        messageInput.addEventListener("input", updateMessagePreview);
    }

    if (saveButton) {
        saveButton.addEventListener("click", async () => {
            const message = messageInput?.value.trim() || "";

            if (!message) {
                showStatus("Isi pesan tidak boleh kosong.", "error");
                messageInput?.focus();
                return;
            }

            saveButton.disabled = true;
            saveButton.textContent = "Menyimpan...";

            try {
                await BCGDB.saveTemplate({
                    message
                });

                showStatus("Template berhasil disimpan!", "success");

                // Sinkronisasi template terbaru ke Broadcast Center
                if (typeof window.refreshBroadcastData === "function") {
                    await window.refreshBroadcastData();
                }

                const totalTemplates = document.getElementById("totalTemplates");

                if (totalTemplates) {
                    totalTemplates.textContent = "1";
                }

            } catch (error) {
                console.error("Gagal menyimpan template:", error);
                showStatus("Gagal menyimpan template. Coba lagi.", "error");

            } finally {
                saveButton.disabled = false;
                saveButton.textContent = "Simpan Template";
            }
        });
    }

    await loadPreviewContact();
    await loadSavedTemplate();
});

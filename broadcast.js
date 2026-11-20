
document.addEventListener("DOMContentLoaded", async () => {
    const contactName = document.getElementById("broadcastContactName");
    const contactPhone = document.getElementById("broadcastContactPhone");
    const contactIndex = document.getElementById("broadcastContactIndex");

    const messagePreview = document.getElementById("broadcastMessagePreview");

    const previousButton = document.getElementById("broadcastPrevious");
    const nextButton = document.getElementById("broadcastNext");
    const copyButton = document.getElementById("copyBroadcastMessage");
    const whatsappButton = document.getElementById("openBroadcastWhatsApp");

    const progressText = document.getElementById("broadcastProgressText");
    const progressBar = document.getElementById("broadcastProgressBar");

    const emptyState = document.getElementById("broadcastEmpty");
    const status = document.getElementById("broadcastStatus");

    const markSentButton = document.getElementById("markBroadcastSent");
    const markFailedButton = document.getElementById("markBroadcastFailed");

    let contacts = [];
    let currentIndex = 0;
    let savedTemplate = null;
    let isRecording = false;

    function showStatus(message, type = "success") {
        if (!status) return;

        status.textContent = message;
        status.className = `import-status ${type}`;
    }

    function getPersonalizedMessage() {
        const contact = contacts[currentIndex];

        if (!contact || !savedTemplate) {
            return "";
        }

        const name = contact.name || "Pelanggan";

        return (savedTemplate.message || "").replace(
            /{{\s*nama\s*}}/gi,
            name
        );
    }

    function renderBroadcastContact() {
        const total = contacts.length;

        if (total === 0) {
            if (contactName) {
                contactName.textContent = "Belum ada kontak";
            }

            if (contactPhone) {
                contactPhone.textContent = "Impor kontak terlebih dahulu";
            }

            if (contactIndex) {
                contactIndex.textContent = "0 / 0";
            }

            if (progressText) {
                progressText.textContent = "0 dari 0 kontak";
            }

            if (progressBar) {
                progressBar.style.width = "0%";
            }

            if (messagePreview) {
                messagePreview.value = "";
            }

            if (previousButton) previousButton.disabled = true;
            if (nextButton) nextButton.disabled = true;
            if (copyButton) copyButton.disabled = true;
            if (whatsappButton) whatsappButton.disabled = true;
            if (markSentButton) markSentButton.disabled = true;
            if (markFailedButton) markFailedButton.disabled = true;

            if (emptyState) {
                emptyState.hidden = false;
            }

            return;
        }

        // Pastikan indeks tetap valid jika jumlah kontak berubah.
        currentIndex = Math.min(currentIndex, total - 1);

        const contact = contacts[currentIndex];
        const hasMessage = Boolean(savedTemplate?.message?.trim());
        const hasValidContact = Boolean(contact?.phone);

        if (contactName) {
            contactName.textContent = contact.name || "Tanpa Nama";
        }

        if (contactPhone) {
            contactPhone.textContent = contact.phone || "-";
        }

        if (contactIndex) {
            contactIndex.textContent = `${currentIndex + 1} / ${total}`;
        }

        if (progressText) {
            progressText.textContent = `${currentIndex + 1} dari ${total} kontak`;
        }

        if (progressBar) {
            progressBar.style.width =
                `${((currentIndex + 1) / total) * 100}%`;
        }

        if (messagePreview) {
            messagePreview.value = getPersonalizedMessage();
        }

        if (previousButton) {
            previousButton.disabled = currentIndex === 0;
        }

        if (nextButton) {
            nextButton.disabled = currentIndex === total - 1;
        }

        if (copyButton) {
            copyButton.disabled = !hasMessage;
        }

        if (whatsappButton) {
            whatsappButton.disabled = !hasMessage || !hasValidContact;
        }

        if (markSentButton) {
            markSentButton.disabled = !hasMessage || isRecording;
        }

        if (markFailedButton) {
            markFailedButton.disabled = !hasMessage || isRecording;
        }

        if (emptyState) {
            emptyState.hidden = true;
        }
    }

    async function loadBroadcastData() {
        try {
            contacts = await BCGDB.getContacts();
            savedTemplate = await BCGDB.getTemplate();

            renderBroadcastContact();

            if (contacts.length === 0) {
                showStatus("Belum ada kontak untuk diproses.", "error");
            } else if (!savedTemplate || !savedTemplate.message?.trim()) {
                showStatus(
                    "Buat dan simpan template terlebih dahulu di menu Template Pesan.",
                    "error"
                );
            } else {
                showStatus("Broadcast Center siap digunakan.");
            }

        } catch (error) {
            console.error("Gagal memuat Broadcast Center:", error);
            showStatus(
                "Gagal memuat data. Silakan refresh halaman.",
                "error"
            );
        }
    }

    // Fungsi refresh agar bisa dipanggil dari halaman lain.
    window.refreshBroadcastData = loadBroadcastData;

    // TOMBOL KONTAK SEBELUMNYA
    if (previousButton) {
        previousButton.addEventListener("click", () => {
            if (currentIndex > 0) {
                currentIndex--;
                renderBroadcastContact();
                showStatus("Kontak sebelumnya ditampilkan.");
            }
        });
    }

    // TOMBOL KONTAK BERIKUTNYA
    if (nextButton) {
        nextButton.addEventListener("click", () => {
            if (currentIndex < contacts.length - 1) {
                currentIndex++;
                renderBroadcastContact();
                showStatus("Kontak berikutnya ditampilkan.");
            }
        });
    }

    // TOMBOL SALIN PESAN
    if (copyButton) {
        copyButton.addEventListener("click", async () => {
            const message = getPersonalizedMessage();

            if (!message) {
                showStatus(
                    "Belum ada pesan. Simpan template terlebih dahulu.",
                    "error"
                );
                return;
            }

            try {
                await navigator.clipboard.writeText(message);

                showStatus(
                    "Pesan berhasil disalin. Kamu bisa menempelkannya di WhatsApp."
                );

            } catch (error) {
                if (messagePreview) {
                    messagePreview.focus();
                    messagePreview.select();
                }

                showStatus(
                    "Clipboard tidak tersedia. Pesan sudah dipilih; salin secara manual.",
                    "error"
                );
            }
        });
    }

    // TOMBOL BUKA WHATSAPP
    if (whatsappButton) {
        whatsappButton.addEventListener("click", () => {
            const contact = contacts[currentIndex];

            if (!contact || !contact.phone) {
                showStatus("Nomor WhatsApp kontak tidak valid.", "error");
                return;
            }

            const phone = String(contact.phone).replace(/\D/g, "");

            if (!phone) {
                showStatus("Nomor WhatsApp kontak tidak valid.", "error");
                return;
            }

            const message = getPersonalizedMessage();

            if (!message.trim()) {
                showStatus("Pesan template masih kosong.", "error");
                return;
            }

const whatsappUrl =
    `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;

window.open(whatsappUrl, "_blank", "noopener,noreferrer");

            showStatus(
                "WhatsApp dibuka dengan pesan template. Periksa penerima dan pesan sebelum mengirim."
            );
        });
    }

    // MENCATAT STATUS BROADCAST
    async function recordBroadcast(statusValue) {
        const contact = contacts[currentIndex];

        if (isRecording) return;

        if (!contact) {
            showStatus("Tidak ada kontak yang sedang diproses.", "error");
            return;
        }

        if (!savedTemplate || !savedTemplate.message?.trim()) {
            showStatus("Simpan template pesan terlebih dahulu.", "error");
            return;
        }

        isRecording = true;
        renderBroadcastContact();

        try {
            await BCGDB.addHistory({
                contactId: contact.id,
                name: contact.name,
                phone: contact.phone,
                status: statusValue
            });

            showStatus(
                statusValue === "sent"
                    ? "Status berhasil dicatat sebagai Berhasil Dikirim."
                    : "Status berhasil dicatat sebagai Gagal."
            );

            // Perbarui riwayat dan statistik jika tersedia.
            if (typeof window.refreshBroadcastHistory === "function") {
                await window.refreshBroadcastHistory();
            }

        } catch (error) {
            console.error("Gagal mencatat broadcast:", error);

            showStatus(
                "Gagal menyimpan riwayat. Silakan coba lagi.",
                "error"
            );

        } finally {
            isRecording = false;
            renderBroadcastContact();
        }
    }

    // TOMBOL TANDAI BERHASIL
    if (markSentButton) {
        markSentButton.addEventListener("click", () => {
            if (isRecording) return;

            const confirmed = confirm(
                "Apakah kamu sudah menekan tombol kirim di WhatsApp dan memastikan pesan berhasil dikirim?"
            );

            if (confirmed) {
                recordBroadcast("sent");
            }
        });
    }

    // TOMBOL TANDAI GAGAL
    if (markFailedButton) {
        markFailedButton.addEventListener("click", () => {
            if (isRecording) return;

            const confirmed = confirm(
                "Catat kontak ini sebagai gagal diproses?"
            );

            if (confirmed) {
                recordBroadcast("failed");
            }
        });
    }

    // MUAT DATA AWAL
    await loadBroadcastData();
});

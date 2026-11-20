
/* =========================================
   GUDRIDES APP
   CONTACT MANAGEMENT
========================================= */

let contactList = [];
let currentContactIndex = 0;


/* =========================================
   NORMALIZE PHONE NUMBER
========================================= */

function normalizePhone(value) {
    let phone = String(value ?? "").trim();

    // Hapus karakter selain angka.
    phone = phone.replace(/\D/g, "");

    // Format nomor Indonesia menjadi 62.
    if (phone.startsWith("0")) {
        phone = "62" + phone.slice(1);
    } else if (phone.startsWith("8")) {
        phone = "62" + phone;
    }

    // Validasi panjang nomor internasional.
    if (phone.length < 9 || phone.length > 15) {
        return null;
    }

    return phone;
}


/* =========================================
   FIND EXCEL HEADERS
========================================= */

function findColumn(headers, possibleNames) {
    return headers.findIndex(header => {
        const normalized = String(header)
            .toLowerCase()
            .trim()
            .replace(/[_-]/g, " ")
            .replace(/\s+/g, " ");

        return possibleNames.includes(normalized);
    });
}


/* =========================================
   IMPORT EXCEL
========================================= */

const excelInput = document.getElementById("excelFile");

if (excelInput) {
    excelInput.addEventListener("change", async function(event) {
        const file = event.target.files[0];

        if (!file) return;

        try {
            showImportStatus("Membaca file Excel...", "info");

            if (!window.XLSX) {
                throw new Error(
                    "Library Excel belum berhasil dimuat. Periksa koneksi internet."
                );
            }

            const buffer = await file.arrayBuffer();

            const workbook = XLSX.read(buffer, {
                type: "array"
            });

            const firstSheetName = workbook.SheetNames[0];

            if (!firstSheetName) {
                throw new Error("Sheet Excel tidak ditemukan.");
            }

            const sheet = workbook.Sheets[firstSheetName];

            const rows = XLSX.utils.sheet_to_json(sheet, {
                defval: "",
                raw: false
            });

            if (rows.length === 0) {
                throw new Error("File Excel tidak memiliki data.");
            }

            const headers = Object.keys(rows[0]);

            const nameColumn = findColumn(headers, [
                "nama",
                "name",
                "nama kontak",
                "contact name"
            ]);

            const phoneColumn = findColumn(headers, [
                "nomor hp",
                "no hp",
                "nomor telepon",
                "no telepon",
                "phone",
                "phone number",
                "whatsapp",
                "nomor whatsapp"
            ]);

            if (nameColumn === -1 || phoneColumn === -1) {
                throw new Error(
                    "Kolom Nama dan Nomor HP tidak ditemukan. Periksa header Excel."
                );
            }

            const nameHeader = headers[nameColumn];
            const phoneHeader = headers[phoneColumn];

            // Ambil kontak yang sudah tersimpan.
            const existingContacts = await BCGDB.getContacts();

            const existingPhones = new Set(
                existingContacts.map(contact => contact.phone)
            );

            // Mencegah duplikat dalam file yang sama.
            const importedPhones = new Set();

            const validContacts = [];

            let invalidCount = 0;
            let duplicateCount = 0;

            rows.forEach(row => {
                const name = String(row[nameHeader] ?? "").trim();
                const phone = normalizePhone(row[phoneHeader]);

                if (!name || !phone) {
                    invalidCount++;
                    return;
                }

                if (
                    existingPhones.has(phone) ||
                    importedPhones.has(phone)
                ) {
                    duplicateCount++;
                    return;
                }

                importedPhones.add(phone);

                validContacts.push({
                    name: name,
                    phone: phone,
                    createdAt: new Date().toISOString()
                });
            });

            // Simpan hanya kontak baru yang valid.
            if (validContacts.length > 0) {
                await BCGDB.addContacts(validContacts);
            }

            // Perbarui tampilan dan statistik.
            await loadContacts();
            await refreshContactStats();

            // Perbarui Broadcast Center jika tersedia.
            if (typeof window.refreshBroadcastData === "function") {
                await window.refreshBroadcastData();
            }

            showImportStatus(
                `Import selesai! ${validContacts.length} kontak baru berhasil disimpan. ${duplicateCount} duplikat dilewati. ${invalidCount} data tidak valid dilewati.`,
                "success"
            );

        } catch (error) {
            console.error("Import Error:", error);

            showImportStatus(
                error.message || "Gagal mengimpor kontak.",
                "error"
            );

        } finally {
            excelInput.value = "";
        }
    });
}


/* =========================================
   IMPORT STATUS
========================================= */

function showImportStatus(message, type = "info") {
    const status = document.getElementById("importStatus");

    if (!status) return;

    status.textContent = message;
    status.className = `import-status show ${type}`;
}


/* =========================================
   LOAD CONTACTS
========================================= */

async function loadContacts() {
    contactList = await BCGDB.getContacts();

    if (contactList.length === 0) {
        currentContactIndex = 0;
    } else {
        currentContactIndex = Math.min(
            currentContactIndex,
            contactList.length - 1
        );
    }

    renderContact();
}


/* =========================================
   RENDER SINGLE CONTACT
========================================= */

function renderContact() {
    const tableBody = document.getElementById("contactTableBody");
    const position = document.getElementById("contactPosition");
    const currentNumber = document.getElementById("currentContactNumber");

    const previousButton = document.getElementById("previousContact");
    const nextButton = document.getElementById("nextContact");

    if (!tableBody) return;

    const total = contactList.length;

    if (total === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="table-empty">
                    Belum ada kontak. Silakan upload Excel.
                </td>
            </tr>
        `;

        if (position) position.textContent = "0 / 0";
        if (currentNumber) currentNumber.textContent = "0 / 0";

        if (previousButton) previousButton.disabled = true;
        if (nextButton) nextButton.disabled = true;

        return;
    }

    // Pastikan indeks tetap valid.
    currentContactIndex = Math.min(
        currentContactIndex,
        total - 1
    );

    const contact = contactList[currentContactIndex];

    // Gunakan textContent agar nama tidak dianggap HTML.
    const row = document.createElement("tr");

    const numberCell = document.createElement("td");
    numberCell.textContent = String(currentContactIndex + 1);

    const nameCell = document.createElement("td");
    nameCell.textContent = contact.name || "Tanpa Nama";

    const phoneCell = document.createElement("td");
    const phoneLink = document.createElement("a");

    phoneLink.href =
        `https://wa.me/${encodeURIComponent(contact.phone || "")}`;

    phoneLink.target = "_blank";
    phoneLink.rel = "noopener noreferrer";
    phoneLink.className = "contact-phone";
    phoneLink.textContent = contact.phone
        ? `+${contact.phone}`
        : "-";

    phoneCell.appendChild(phoneLink);

    row.append(numberCell, nameCell, phoneCell);

    tableBody.replaceChildren(row);

    // Posisi kontak.
    if (position) {
        position.textContent = `${currentContactIndex + 1} / ${total}`;
    }

    if (currentNumber) {
        currentNumber.textContent = `${currentContactIndex + 1} / ${total}`;
    }

    // Navigasi.
    if (previousButton) {
        previousButton.disabled = currentContactIndex === 0;
    }

    if (nextButton) {
        nextButton.disabled = currentContactIndex === total - 1;
    }
}


/* =========================================
   NEXT CONTACT
========================================= */

const nextContactButton = document.getElementById("nextContact");

if (nextContactButton) {
    nextContactButton.addEventListener("click", function() {
        if (currentContactIndex < contactList.length - 1) {
            currentContactIndex++;
            renderContact();
        }
    });
}


/* =========================================
   PREVIOUS CONTACT
========================================= */

const previousContactButton = document.getElementById("previousContact");

if (previousContactButton) {
    previousContactButton.addEventListener("click", function() {
        if (currentContactIndex > 0) {
            currentContactIndex--;
            renderContact();
        }
    });
}


/* =========================================
   DASHBOARD STATISTICS
========================================= */

async function refreshContactStats() {
    try {
        const total = await BCGDB.countContacts();

        const dashboardCount = document.getElementById("totalContacts");
        const contactCount = document.getElementById("contactCount");

        if (dashboardCount) {
            dashboardCount.textContent = total;
        }

        if (contactCount) {
            contactCount.textContent = total;
        }

        // Statistik pending diperbarui oleh history.js
        // berdasarkan status broadcast terakhir setiap kontak.

    } catch (error) {
        console.error("Statistics Error:", error);
    }
}


/* =========================================
   INITIALIZATION
========================================= */

document.addEventListener("DOMContentLoaded", async function() {
    if (!document.getElementById("page-contacts")) return;

    try {
        await BCGDB.openDB();

        await loadContacts();
        await refreshContactStats();

    } catch (error) {
        console.error("Database Error:", error);

        showImportStatus(
            "Database lokal tidak dapat dibuka.",
            "error"
        );
    }
});

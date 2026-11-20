
document.addEventListener("DOMContentLoaded", () => {

    // =========================================
    // KONFIGURASI LOGIN LOKAL
    // =========================================

    const APP_USERNAME = "Gudrides";
    const APP_PASSWORD = "Belimotordulu";

    const LOGIN_KEY = "bcg_logged_in";
    const USERNAME_KEY = "bcg_username";

    const currentPage = window.location.pathname;
    const isLoginPage = currentPage.endsWith("login.html");

    // Menggunakan localStorage agar status login
    // tetap terbaca di tab browser yang berbeda.
    const isLoggedIn = localStorage.getItem(LOGIN_KEY) === "true";


    // =========================================
    // REDIRECT BERDASARKAN STATUS LOGIN
    // =========================================

    if (isLoginPage && isLoggedIn) {
        window.location.href = "index.html";
        return;
    }

    if (!isLoginPage && !isLoggedIn) {
        window.location.href = "login.html";
        return;
    }


    // =========================================
    // LOGIN
    // =========================================

    const loginForm = document.getElementById("loginForm");

    if (loginForm) {

        const usernameInput = document.getElementById("username");
        const passwordInput = document.getElementById("password");
        const loginError = document.getElementById("loginError");

        loginForm.addEventListener("submit", (event) => {

            event.preventDefault();

            const username = usernameInput?.value.trim() || "";
            const password = passwordInput?.value || "";

            if (
                username === APP_USERNAME &&
                password === APP_PASSWORD
            ) {

                localStorage.setItem(LOGIN_KEY, "true");
                localStorage.setItem(USERNAME_KEY, username);

                window.location.href = "index.html";
                return;

            }

            if (loginError) {
                loginError.textContent = "Username atau password salah.";
                loginError.hidden = false;
            }

            if (passwordInput) {
                passwordInput.value = "";
                passwordInput.focus();
            }

        });

        [usernameInput, passwordInput].forEach((input) => {

            input?.addEventListener("input", () => {

                if (loginError) {
                    loginError.hidden = true;
                    loginError.textContent = "";
                }

            });

        });

    }


    // =========================================
    // INFORMASI HALAMAN
    // =========================================

    const pageInformation = {

        dashboard: {
            title: "Dashboard",
            subtitle: "Selamat datang di Gudrides APP."
        },

        contacts: {
            title: "Manajemen Kontak",
            subtitle: "Kelola dan impor database kontak."
        },

        template: {
            title: "Template Pesan",
            subtitle: "Atur template pesan WhatsApp."
        },

        broadcast: {
            title: "Broadcast Center",
            subtitle: "Kelola proses broadcast WhatsApp."
        },

        history: {
            title: "Riwayat Broadcast",
            subtitle: "Lihat riwayat aktivitas broadcast."
        },

        settings: {
            title: "Pengaturan",
            subtitle: "Kelola pengaturan dan database aplikasi."
        },

        reminder: {
            title: "Dashboard Reminder",
            subtitle: "Kelola dan pantau kebutuhan pengajuan kantor."
        }

    };


    // =========================================
    // ELEMEN SUBMENU BROADCAST
    // =========================================

    const broadcastMenuToggle =
        document.getElementById("broadcastMenuToggle");

    const broadcastSubmenu =
        document.getElementById("broadcastSubmenu");


    function setBroadcastSubmenu(open) {

        if (!broadcastMenuToggle || !broadcastSubmenu) {
            return;
        }

        broadcastMenuToggle.classList.toggle("expanded", open);

        broadcastMenuToggle.setAttribute(
            "aria-expanded",
            String(open)
        );

        broadcastSubmenu.hidden = !open;

        broadcastSubmenu.classList.toggle("open", open);

    }


    // =========================================
    // NAVIGASI HALAMAN
    // =========================================

    const broadcastPages = [
        "contacts",
        "template",
        "broadcast",
        "history"
    ];


    function navigateToPage(pageName) {

        const targetPage = document.getElementById(`page-${pageName}`);

        if (!targetPage) {
            return;
        }

        // Tampilkan halaman yang dipilih
        document.querySelectorAll(".page-section").forEach((section) => {

            section.classList.remove("active");

        });

        targetPage.classList.add("active");


        // Perbarui status menu utama
        document.querySelectorAll(".menu-item").forEach((item) => {

            item.classList.toggle(
                "active",
                item.dataset.page === pageName
            );

        });


        // Perbarui status submenu
        document.querySelectorAll(".submenu-item").forEach((item) => {

            item.classList.toggle(
                "active",
                item.dataset.page === pageName
            );

        });


        // Buka submenu jika halaman termasuk Aplikasi Broadcast
        const isBroadcastPage = broadcastPages.includes(pageName);

        if (broadcastMenuToggle) {

            broadcastMenuToggle.classList.toggle(
                "active",
                isBroadcastPage
            );

        }

        setBroadcastSubmenu(isBroadcastPage);


        // Perbarui judul dan subtitle
        const pageTitle = document.getElementById("pageTitle");
        const pageSubtitle = document.getElementById("pageSubtitle");

        const information = pageInformation[pageName];

        if (information) {

            if (pageTitle) {
                pageTitle.textContent = information.title;
            }

            if (pageSubtitle) {
                pageSubtitle.textContent = information.subtitle;
            }

        }


        // Perbarui data Broadcast saat halaman dibuka
        if (
            pageName === "broadcast" &&
            typeof window.refreshBroadcastData === "function"
        ) {

            window.refreshBroadcastData();

        }


        // Tutup sidebar mobile jika tersedia
        document.body.classList.remove("sidebar-open");

    }


    // Supaya fungsi navigasi bisa dipakai file lain
    window.navigateToPage = navigateToPage;


    // =========================================
    // EVENT SUBMENU BROADCAST
    // =========================================

    if (broadcastMenuToggle) {

        broadcastMenuToggle.addEventListener("click", () => {

            const isExpanded =
                broadcastMenuToggle.getAttribute("aria-expanded") === "true";

            setBroadcastSubmenu(!isExpanded);

        });

    }


    // =========================================
    // EVENT NAVIGASI HALAMAN
    // =========================================

    document.addEventListener("click", (event) => {

        const pageTrigger = event.target.closest("[data-page]");

        if (!pageTrigger) {
            return;
        }

        // Abaikan tombol yang dinonaktifkan
        if (pageTrigger.disabled) {
            return;
        }

        const pageName = pageTrigger.dataset.page;

        if (
            !pageName ||
            !document.getElementById(`page-${pageName}`)
        ) {
            return;
        }

        event.preventDefault();

        navigateToPage(pageName);

    });


    // =========================================
    // NAMA USER DI SIDEBAR
    // =========================================

    const sidebarUsername =
        document.getElementById("sidebarUsername");

    if (sidebarUsername) {

        sidebarUsername.textContent =
            localStorage.getItem(USERNAME_KEY) || "Admin";

    }


    // =========================================
    // LOGOUT
    // =========================================

    const logoutButton =
        document.getElementById("logoutButton");

    if (logoutButton) {

        logoutButton.addEventListener("click", () => {

            const confirmation = confirm(
                "Apakah kamu yakin ingin keluar dari Gudrides APP?"
            );

            if (!confirmation) {
                return;
            }

            localStorage.removeItem(LOGIN_KEY);
            localStorage.removeItem(USERNAME_KEY);

            window.location.href = "login.html";

        });

    }


    // =========================================
    // INISIALISASI HALAMAN
    // =========================================

    const activeSection =
        document.querySelector(".page-section.active");

    if (activeSection) {

        const pageName =
            activeSection.id.replace("page-", "");

        const information = pageInformation[pageName];

        if (information) {

            const pageTitle =
                document.getElementById("pageTitle");

            const pageSubtitle =
                document.getElementById("pageSubtitle");

            if (pageTitle) {
                pageTitle.textContent = information.title;
            }

            if (pageSubtitle) {
                pageSubtitle.textContent = information.subtitle;
            }

        }


        // Sinkronkan status submenu dengan halaman awal
        const isBroadcastPage =
            broadcastPages.includes(pageName);

        if (broadcastMenuToggle) {

            broadcastMenuToggle.classList.toggle(
                "active",
                isBroadcastPage
            );

        }

        setBroadcastSubmenu(isBroadcastPage);

    }

});

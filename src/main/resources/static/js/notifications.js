(function () {
    "use strict";

    const TOAST_DURATION = 3800;
    let confirmationResolver = null;

    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.5L13.7 4.2a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>'
    };

    function ensureNotificationUi() {
        if (!document.getElementById("toast-container")) {
            const toastContainer = document.createElement("div");
            toastContainer.id = "toast-container";
            toastContainer.className = "toast-container";
            toastContainer.setAttribute("aria-live", "polite");
            toastContainer.setAttribute("aria-atomic", "false");
            document.body.append(toastContainer);
        }

        if (!document.getElementById("error-dialog")) {
            document.body.insertAdjacentHTML("beforeend", createErrorDialogMarkup());
        }

        if (!document.getElementById("confirmation-dialog")) {
            document.body.insertAdjacentHTML("beforeend", createConfirmationDialogMarkup());
        }

        bindDialogEvents();
    }

    function createErrorDialogMarkup() {
        return `
            <dialog class="notification-dialog notification-dialog-error" id="error-dialog" aria-labelledby="error-dialog-title">
                <div class="notification-dialog-header">
                    <span class="notification-dialog-icon" aria-hidden="true">!</span>
                    <h2 id="error-dialog-title">Fehler</h2>
                </div>
                <div class="notification-dialog-body"><p id="error-dialog-message"></p></div>
                <div class="notification-dialog-actions">
                    <button class="button button-error" type="button" data-error-dialog-close>OK</button>
                </div>
            </dialog>`;
    }

    function createConfirmationDialogMarkup() {
        return `
            <dialog class="notification-dialog notification-dialog-confirm" id="confirmation-dialog" aria-labelledby="confirmation-dialog-title">
                <div class="notification-dialog-header">
                    <span class="notification-dialog-icon" aria-hidden="true">?</span>
                    <h2 id="confirmation-dialog-title">Aktion bestätigen</h2>
                </div>
                <div class="notification-dialog-body"><p id="confirmation-dialog-message"></p></div>
                <div class="notification-dialog-actions">
                    <button class="button button-secondary" type="button" data-confirmation-cancel>Abbrechen</button>
                    <button class="button button-error" type="button" data-confirmation-accept>Bestätigen</button>
                </div>
            </dialog>`;
    }

    function bindDialogEvents() {
        const errorDialog = document.getElementById("error-dialog");
        if (!errorDialog.dataset.notificationsReady) {
            errorDialog.dataset.notificationsReady = "true";
            errorDialog.querySelectorAll("[data-error-dialog-close]").forEach((button) => {
                button.addEventListener("click", () => errorDialog.close());
            });
            errorDialog.addEventListener("click", (event) => closeOnBackdrop(event, errorDialog));
        }

        const confirmationDialog = document.getElementById("confirmation-dialog");
        if (!confirmationDialog.dataset.notificationsReady) {
            confirmationDialog.dataset.notificationsReady = "true";
            confirmationDialog.querySelector("[data-confirmation-cancel]").addEventListener("click", () => closeConfirmation(false));
            confirmationDialog.querySelector("[data-confirmation-accept]").addEventListener("click", () => closeConfirmation(true));
            confirmationDialog.addEventListener("cancel", (event) => {
                event.preventDefault();
                closeConfirmation(false);
            });
            confirmationDialog.addEventListener("click", (event) => {
                if (event.target === confirmationDialog) {
                    closeConfirmation(false);
                }
            });
        }
    }

    function closeOnBackdrop(event, dialog) {
        if (event.target === dialog) {
            dialog.close();
        }
    }

    function showToast(type, message) {
        ensureNotificationUi();

        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.setAttribute("role", "status");

        const icon = document.createElement("span");
        icon.className = "toast-icon";
        icon.innerHTML = icons[type];

        const text = document.createElement("p");
        text.className = "toast-message";
        text.textContent = String(message || "");

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "toast-close";
        closeButton.setAttribute("aria-label", "Benachrichtigung schließen");
        closeButton.textContent = "×";

        let timeoutId;
        const removeToast = () => {
            window.clearTimeout(timeoutId);
            if (toast.classList.contains("is-leaving")) {
                return;
            }
            toast.classList.add("is-leaving");
            toast.addEventListener("animationend", () => toast.remove(), { once: true });
        };

        closeButton.addEventListener("click", removeToast);
        toast.append(icon, text, closeButton);
        document.getElementById("toast-container").append(toast);
        timeoutId = window.setTimeout(removeToast, TOAST_DURATION);
    }

    function showSuccess(message) {
        showToast("success", message);
    }

    function showInfo(message) {
        showToast("info", message);
    }

    function showWarning(message) {
        showToast("warning", message);
    }

    function showError(title, message) {
        ensureNotificationUi();
        const dialog = document.getElementById("error-dialog");
        document.getElementById("error-dialog-title").textContent = title || "Fehler";
        document.getElementById("error-dialog-message").textContent = message || "Ein unerwarteter Fehler ist aufgetreten.";

        if (!dialog.open) {
            dialog.showModal();
        }
    }

    function showConfirmation(title, message, confirmLabel = "Bestätigen") {
        ensureNotificationUi();
        const dialog = document.getElementById("confirmation-dialog");

        if (confirmationResolver) {
            closeConfirmation(false);
        }

        document.getElementById("confirmation-dialog-title").textContent = title || "Aktion bestätigen";
        document.getElementById("confirmation-dialog-message").textContent = message || "Möchten Sie fortfahren?";
        dialog.querySelector("[data-confirmation-accept]").textContent = confirmLabel;

        return new Promise((resolve) => {
            confirmationResolver = resolve;
            dialog.showModal();
        });
    }

    function closeConfirmation(confirmed) {
        const dialog = document.getElementById("confirmation-dialog");
        if (dialog?.open) {
            dialog.close();
        }
        if (confirmationResolver) {
            const resolve = confirmationResolver;
            confirmationResolver = null;
            resolve(confirmed);
        }
    }

    window.showSuccess = showSuccess;
    window.showInfo = showInfo;
    window.showWarning = showWarning;
    window.showError = showError;
    window.showConfirmation = showConfirmation;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", ensureNotificationUi, { once: true });
    } else {
        ensureNotificationUi();
    }
}());

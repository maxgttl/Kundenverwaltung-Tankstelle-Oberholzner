const CUSTOMER_API_URL = "/kunde";
const LICENSE_PLATE_API_URL = "/licensePlate";
const PAGE_SIZE = 10;

let customerModal;
let customerForm;
let customerSearch;
let customerTableBody;
let customerPagination;
let customerRecordCount;
let csvImportDialog;
let csvImportFileInput;
let csvImportButton;
let selectedCsvFile = null;
let customers = [];
let currentPage = 0;
let totalPages = 0;
let totalCustomers = 0;
let searchDelayId;

// Seite initialisieren
function initializeCustomersPage() {
    customerModal = document.getElementById("customer-modal");
    customerForm = document.getElementById("customer-form");
    customerSearch = document.getElementById("customer-search");
    customerTableBody = document.getElementById("customers-table-body");
    customerPagination = document.getElementById("customer-pagination");
    customerRecordCount = document.getElementById("customer-record-count");
    csvImportDialog = document.getElementById("csv-import-dialog");
    csvImportFileInput = document.getElementById("csv-import-file");
    csvImportButton = document.getElementById("import-csv-button");

    document.getElementById("new-customer-button").addEventListener("click", () => openCustomerModal());
    document.getElementById("open-csv-import-button").addEventListener("click", openCsvImportDialog);
    document.getElementById("close-customer-modal").addEventListener("click", closeCustomerModal);
    document.getElementById("cancel-customer-button").addEventListener("click", closeCustomerModal);
    document.getElementById("close-csv-import-button").addEventListener("click", closeCsvImportDialog);
    document.getElementById("cancel-csv-import-button").addEventListener("click", closeCsvImportDialog);
    csvImportFileInput.addEventListener("change", handleCsvFileSelection);
    csvImportButton.addEventListener("click", importCustomersFromCsv);
    csvImportDialog.addEventListener("close", resetCsvImport);
    csvImportDialog.addEventListener("click", handleCsvImportBackdropClick);
    customerForm.addEventListener("submit", saveCustomer);
    customerSearch.addEventListener("input", searchCustomers);
    customerTableBody.addEventListener("click", handleCustomerAction);
    customerPagination.addEventListener("click", handlePaginationClick);

    loadCustomers().catch(handleCustomerError);
}

// Daten vom Backend laden
async function loadCustomers(page = 0) {
    const searchText = customerSearch.value.trim();

    if (searchText) {
        const response = await request(`${CUSTOMER_API_URL}/search?text=${encodeURIComponent(searchText)}`);
        customers = await response.json();
        currentPage = 0;
        totalPages = 1;
        totalCustomers = customers.length;
    } else {
        const response = await request(`${CUSTOMER_API_URL}/page?page=${page}&size=${PAGE_SIZE}&sort=customerName,asc`);
        const customerPage = await response.json();
        customers = customerPage.content;
        currentPage = customerPage.number;
        totalPages = customerPage.totalPages;
        totalCustomers = customerPage.totalElements;
    }

    const licensePlateCounts = await loadLicensePlateCounts();
    customers.forEach((customer) => {
        customer.licensePlateCount = licensePlateCounts.get(customer.id) || 0;
    });

    renderCustomers();
    updateCustomerRecordCount();
    updateCustomerPagination();
}

async function loadLicensePlateCounts() {
    const firstResponse = await request(`${LICENSE_PLATE_API_URL}/page?page=0&size=100&sort=stationNumber,asc`);
    const firstPage = await firstResponse.json();
    const remainingRequests = Array.from(
        { length: Math.max(0, firstPage.totalPages - 1) },
        (_, index) => request(`${LICENSE_PLATE_API_URL}/page?page=${index + 1}&size=100&sort=stationNumber,asc`)
            .then((response) => response.json())
    );
    const licensePlates = [firstPage, ...(await Promise.all(remainingRequests))]
        .flatMap((page) => page.content);

    return licensePlates.reduce((counts, licensePlate) => {
        const customerId = licensePlate.customer?.id;
        if (customerId) {
            counts.set(customerId, (counts.get(customerId) || 0) + 1);
        }
        return counts;
    }, new Map());
}

// Tabelle rendern
function renderCustomers() {
    customerTableBody.replaceChildren();

    if (customers.length === 0) {
        renderEmptyState("Keine Kunden gefunden.");
        return;
    }

    customers.forEach((customer) => {
        const row = document.createElement("tr");
        addCell(row, customer.customerName);
        addCell(row, customer.zipCode);
        addCell(row, customer.city);
        addCell(row, customer.address);
        addCell(row, customer.licensePlateCount);

        const actionsCell = document.createElement("td");
        actionsCell.className = "actions-column";
        actionsCell.append(createCustomerActionButtons(customer.id));
        row.append(actionsCell);
        customerTableBody.append(row);
    });
}

function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value === null || value === undefined || value === "" ? "-" : String(value);
    row.append(cell);
}

function renderEmptyState(message) {
    const row = document.createElement("tr");
    row.className = "empty-state";

    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = message;
    row.append(cell);
    customerTableBody.append(row);
}

function updateCustomerRecordCount() {
    customerRecordCount.textContent = `Gesamtanzahl Kunden: ${totalCustomers}`;
}

function createCustomerActionButtons(customerId) {
    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.append(
        createActionButton("edit", customerId, "Kunde bearbeiten", "Icons/pen-to-square-regular-full.svg"),
        createActionButton("delete", customerId, "Kunde löschen", "Icons/trash-can-regular-full.svg")
    );
    return actions;
}

function createActionButton(action, customerId, label, iconPath) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `icon-button ${action}`;
    button.dataset.customerAction = action;
    button.dataset.customerId = String(customerId);
    button.setAttribute("aria-label", label);
    button.title = label;

    // Feste Inline-Maße verhindern eine übergroße SVG-Darstellung bei einer alten CSS-Kopie im Browser.
    button.style.inlineSize = "2.2rem";
    button.style.blockSize = "2.2rem";
    button.style.minInlineSize = "2.2rem";
    button.style.overflow = "hidden";

    const icon = document.createElement("img");
    icon.src = iconPath;
    icon.width = 16;
    icon.height = 16;
    icon.alt = "";
    icon.style.inlineSize = "1rem";
    icon.style.blockSize = "1rem";
    icon.style.maxInlineSize = "1rem";
    icon.style.maxBlockSize = "1rem";
    button.append(icon);

    return button;
}

// Suche ausführen
function searchCustomers() {
    window.clearTimeout(searchDelayId);
    searchDelayId = window.setTimeout(() => {
        loadCustomers().catch(handleCustomerError);
    }, 250);
}

// Formular öffnen
function openCustomerModal(customer = null) {
    customerForm.reset();
    document.getElementById("customer-id").value = "";

    const modalTitle = document.getElementById("customer-modal-title");
    modalTitle.textContent = customer ? "Kunde bearbeiten" : "Neuer Kunde";

    if (customer) {
        document.getElementById("customer-id").value = customer.id;
        customerForm.elements.customerName.value = customer.customerName || "";
        customerForm.elements.zipCode.value = customer.zipCode || "";
        customerForm.elements.city.value = customer.city || "";
        customerForm.elements.address.value = customer.address || "";
    }

    customerModal.showModal();
    document.getElementById("customer-name").focus();
}

// Formular schließen
function closeCustomerModal() {
    customerModal.close();
}

// CSV-Import öffnen und zurücksetzen
function openCsvImportDialog() {
    resetCsvImport();
    csvImportDialog.showModal();
}

function closeCsvImportDialog() {
    csvImportDialog.close();
}

function handleCsvImportBackdropClick(event) {
    if (event.target === csvImportDialog) {
        closeCsvImportDialog();
    }
}

function resetCsvImport() {
    selectedCsvFile = null;
    csvImportFileInput.value = "";
    csvImportButton.disabled = true;
    csvImportButton.textContent = "Importieren";
    document.getElementById("csv-import-file-name").textContent = "Keine Datei ausgewählt";
    document.getElementById("csv-preview-body").replaceChildren();
    document.getElementById("csv-record-count").textContent = "";
    document.getElementById("csv-preview").hidden = true;
}

// CSV-Datei clientseitig einlesen und maximal fünf Datensätze anzeigen
async function handleCsvFileSelection() {
    const file = csvImportFileInput.files[0];
    resetCsvPreview();

    if (!file) {
        return;
    }

    document.getElementById("csv-import-file-name").textContent = file.name;

    if (!file.name.toLocaleLowerCase("de-DE").endsWith(".csv")) {
        rejectCsvFile("Bitte wählen Sie eine Datei mit der Endung .csv aus.");
        return;
    }

    try {
        const csvText = await readCsvFile(file);
        const records = parseAndValidateCsv(csvText);
        selectedCsvFile = file;
        renderCsvPreview(records);
        csvImportButton.disabled = false;
    } catch (error) {
        rejectCsvFile(error instanceof Error ? error.message : "Die CSV-Datei ist ungültig.");
    }
}

function resetCsvPreview() {
    selectedCsvFile = null;
    csvImportButton.disabled = true;
    document.getElementById("csv-preview-body").replaceChildren();
    document.getElementById("csv-record-count").textContent = "";
    document.getElementById("csv-preview").hidden = true;
}

function rejectCsvFile(message) {
    csvImportFileInput.value = "";
    selectedCsvFile = null;
    csvImportButton.disabled = true;
    document.getElementById("csv-import-file-name").textContent = "Keine Datei ausgewählt";
    window.showError("Ungültige CSV-Datei", message);
}

function readCsvFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(String(reader.result || "")));
        reader.addEventListener("error", () => reject(new Error("Die CSV-Datei konnte nicht gelesen werden.")));
        reader.readAsText(file, "UTF-8");
    });
}

function parseAndValidateCsv(csvText) {
    const lines = csvText
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "");

    if (lines.length < 2) {
        throw new Error("Die CSV-Datei enthält keine Kundendaten.");
    }

    if (splitCsvLine(lines[0]).length !== 4) {
        throw new Error("Die CSV-Datei muss vier Spalten enthalten.");
    }

    const records = lines.slice(1).map((line, index) => {
        const fields = splitCsvLine(line);
        if (fields.length !== 4 || !fields[0]) {
            throw new Error(`Datensatz ${index + 2} entspricht nicht dem erwarteten CSV-Format.`);
        }
        return fields;
    });

    return records;
}

function splitCsvLine(line) {
    return line.split(";").map((value) => value.trim());
}

function renderCsvPreview(records) {
    const previewBody = document.getElementById("csv-preview-body");
    records.slice(0, 5).forEach((record) => {
        const row = document.createElement("tr");
        record.forEach((value) => addCsvPreviewCell(row, value));
        previewBody.append(row);
    });

    document.getElementById("csv-record-count").textContent = `Gesamtanzahl der Datensätze: ${records.length}`;
    document.getElementById("csv-preview").hidden = false;
}

function addCsvPreviewCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value || "-";
    row.append(cell);
}

// Ausgewählte Originaldatei als Multipart-Upload an das Backend senden
async function importCustomersFromCsv() {
    if (!selectedCsvFile || csvImportButton.disabled) {
        return;
    }

    const formData = new FormData();
    formData.append("file", selectedCsvFile);
    csvImportButton.disabled = true;
    csvImportButton.textContent = "Wird importiert ...";

    try {
        await request(`${CUSTOMER_API_URL}/import`, { method: "POST", body: formData });
        closeCsvImportDialog();
        await loadCustomers();
        window.showSuccess("Kunden erfolgreich importiert.");
    } catch (_) {
        csvImportButton.disabled = false;
        csvImportButton.textContent = "Importieren";
        window.showError("Import fehlgeschlagen", "Die CSV-Datei konnte nicht importiert werden.");
    }
}

// Datensatz speichern
async function saveCustomer(event) {
    event.preventDefault();

    const customerId = document.getElementById("customer-id").value;
    const customerName = customerForm.elements.customerName.value.trim();
    const customer = {
        customerName,
        // Das Backend erwartet diese nicht leere Datenbankspalte beim Anlegen.
        normalizedCustomerName: normalizeCustomerName(customerName),
        zipCode: customerForm.elements.zipCode.value.trim(),
        city: customerForm.elements.city.value.trim(),
        address: customerForm.elements.address.value.trim()
    };

    try {
        await request(customerId ? `${CUSTOMER_API_URL}/${customerId}` : CUSTOMER_API_URL, {
            method: customerId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(customer)
        });

        closeCustomerModal();
        await loadCustomers(currentPage);
        window.showSuccess(customerId ? "Kunde erfolgreich aktualisiert." : "Kunde erfolgreich gespeichert.");
    } catch (error) {
        handleCustomerError(error);
    }
}

function normalizeCustomerName(customerName) {
    return customerName.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

// Datensatz bearbeiten
function editCustomer(customerId) {
    const customer = customers.find((entry) => entry.id === customerId);

    if (!customer) {
        handleCustomerError(new Error("Der ausgewählte Kunde ist nicht mehr verfügbar."));
        return;
    }

    openCustomerModal(customer);
}

// Datensatz löschen
async function deleteCustomer(customerId) {
    const customer = customers.find((entry) => entry.id === customerId);
    const name = customer?.customerName || `Kunde ${customerId}`;

    const confirmed = await window.showConfirmation(
        "Kunde löschen",
        `Möchten Sie den Kunden „${name}“ wirklich löschen?`,
        "Löschen"
    );
    if (!confirmed) {
        return;
    }

    try {
        await request(`${CUSTOMER_API_URL}/${customerId}`, { method: "DELETE" });
        const pageAfterDelete = customers.length === 1 && currentPage > 0 ? currentPage - 1 : currentPage;
        await loadCustomers(pageAfterDelete);
        window.showSuccess("Kunde erfolgreich gelöscht.");
    } catch (error) {
        handleCustomerError(error);
    }
}

function handleCustomerAction(event) {
    const button = event.target.closest("[data-customer-action]");
    if (!button) {
        return;
    }

    const customerId = Number(button.dataset.customerId);
    if (!Number.isInteger(customerId)) {
        return;
    }

    if (button.dataset.customerAction === "edit") {
        editCustomer(customerId);
    }

    if (button.dataset.customerAction === "delete") {
        deleteCustomer(customerId);
    }
}

function handlePaginationClick(event) {
    const button = event.target.closest("[data-page]");
    if (!button || button.disabled || customerSearch.value.trim()) {
        return;
    }

    const requestedPage = button.dataset.page;
    if (requestedPage === "previous") {
        loadCustomers(currentPage - 1).catch(handleCustomerError);
    } else if (requestedPage === "next") {
        loadCustomers(currentPage + 1).catch(handleCustomerError);
    } else if (/^\d+$/.test(requestedPage)) {
        loadCustomers(Number(requestedPage) - 1).catch(handleCustomerError);
    }
}

// Pagination aktualisieren
function updateCustomerPagination() {
    const isSearching = Boolean(customerSearch.value.trim());
    customerPagination.replaceChildren();
    customerPagination.hidden = isSearching || totalPages <= 1;

    if (customerPagination.hidden) {
        return;
    }

    customerPagination.append(
        createPageButton("‹", "previous", currentPage === 0, false, "Vorherige Seite"),
        ...getVisiblePages().map((page) => createPageButton(String(page + 1), String(page + 1), false, page === currentPage)),
        createPageButton("›", "next", currentPage >= totalPages - 1, false, "Nächste Seite")
    );
}

function getVisiblePages() {
    const start = Math.max(0, Math.min(currentPage - 1, totalPages - 3));
    const end = Math.min(totalPages, start + 3);
    return Array.from({ length: end - start }, (_, index) => start + index);
}

function createPageButton(label, page, disabled = false, active = false, accessibleLabel = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.page = page;
    button.disabled = disabled;
    button.classList.toggle("active", active);

    if (active) {
        button.setAttribute("aria-current", "page");
    }
    if (accessibleLabel) {
        button.setAttribute("aria-label", accessibleLabel);
    }

    return button;
}

async function request(url, options = {}) {
    const response = await fetch(url, options);
    if (response.ok) {
        return response;
    }

    throw new Error(await getErrorMessage(response));
}

async function getErrorMessage(response) {
    try {
        const error = await response.json();
        if (error.message) {
            return error.message;
        }
        if (error.messages) {
            return Object.values(error.messages).join(" ");
        }
    } catch (_) {
        // Der Server hat keinen JSON-Fehlertext geliefert.
    }

    return "Die Anfrage konnte nicht verarbeitet werden.";
}

function handleCustomerError(error) {
    const message = error instanceof Error ? error.message : "Ein unerwarteter Fehler ist aufgetreten.";
    window.showError("Kunde konnte nicht verarbeitet werden", message);
}

document.addEventListener("DOMContentLoaded", initializeCustomersPage);

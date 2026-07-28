const LICENSE_PLATE_API_URL = "/licensePlate";
const CUSTOMER_API_URL = "/kunde";
const LICENSE_PLATE_IMPORT_API_URL = "/kennzeichen/import";
const PAGE_SIZE = 10;
const NON_UNIQUE_LICENSE_PLATES = new Set(["MASCHINEN", "TANKGUTSCHEINE"]);

let licensePlateModal;
let licensePlateForm;
let customerSelect;
let licensePlateSearch;
let licensePlateTableBody;
let licensePlatePagination;
let licensePlateRecordCount;
let licensePlateImportDialog;
let licensePlateImportFileInput;
let licensePlateImportButton;
let selectedLicensePlateCsvFile = null;
let selectedLicensePlateCsvRecords = [];
let licensePlates = [];
let currentPage = 0;
let totalPages = 0;
let totalLicensePlates = 0;
let searchDelayId;

// Seite initialisieren
function initializeLicensePlatesPage() {
    licensePlateModal = document.getElementById("license-plate-modal");
    licensePlateForm = document.getElementById("license-plate-form");
    customerSelect = document.getElementById("license-plate-customer");
    licensePlateSearch = document.getElementById("license-plate-search");
    licensePlateTableBody = document.getElementById("license-plates-table-body");
    licensePlatePagination = document.getElementById("license-plate-pagination");
    licensePlateRecordCount = document.getElementById("license-plate-record-count");
    licensePlateImportDialog = document.getElementById("license-plate-import-dialog");
    licensePlateImportFileInput = document.getElementById("license-plate-import-file");
    licensePlateImportButton = document.getElementById("import-license-plate-csv-button");

    document.getElementById("new-license-plate-button").addEventListener("click", () => openLicensePlateModal());
    document.getElementById("open-license-plate-import-button").addEventListener("click", openLicensePlateImportDialog);
    document.getElementById("close-license-plate-modal").addEventListener("click", closeLicensePlateModal);
    document.getElementById("cancel-license-plate-button").addEventListener("click", closeLicensePlateModal);
    document.getElementById("close-license-plate-import-button").addEventListener("click", closeLicensePlateImportDialog);
    document.getElementById("cancel-license-plate-import-button").addEventListener("click", closeLicensePlateImportDialog);
    licensePlateImportFileInput.addEventListener("change", handleLicensePlateCsvFileSelection);
    licensePlateImportButton.addEventListener("click", importLicensePlatesFromCsv);
    licensePlateImportDialog.addEventListener("close", resetLicensePlateImport);
    licensePlateImportDialog.addEventListener("click", handleLicensePlateImportBackdropClick);
    licensePlateForm.addEventListener("submit", saveLicensePlate);
    licensePlateSearch.addEventListener("input", searchLicensePlates);
    licensePlateTableBody.addEventListener("click", handleLicensePlateAction);
    licensePlatePagination.addEventListener("click", handlePaginationClick);

    loadLicensePlates().catch(handleLicensePlateError);
}

// Daten vom Backend laden
async function loadLicensePlates(page = 0) {
    const searchText = licensePlateSearch.value.trim();

    if (searchText) {
        const response = await request(
            `${LICENSE_PLATE_API_URL}/search?search=${encodeURIComponent(normalizeLicensePlate(searchText))}`
        );
        licensePlates = await response.json();
        currentPage = 0;
        totalPages = 1;
        totalLicensePlates = licensePlates.length;
    } else {
        const response = await request(
            `${LICENSE_PLATE_API_URL}/page?page=${page}&size=${PAGE_SIZE}`
        );
        const licensePlatePage = await response.json();
        licensePlates = licensePlatePage.content;
        currentPage = licensePlatePage.number;
        totalPages = licensePlatePage.totalPages;
        totalLicensePlates = licensePlatePage.totalElements;
    }

    renderLicensePlates();
    updateLicensePlateRecordCount();
    updateLicensePlatePagination();
}

function updateLicensePlateRecordCount() {
    licensePlateRecordCount.textContent = `Gesamtanzahl Kennzeichen: ${totalLicensePlates}`;
}

// Tabelle rendern
function renderLicensePlates() {
    licensePlateTableBody.replaceChildren();

    if (licensePlates.length === 0) {
        renderEmptyState("Keine Kennzeichen gefunden.");
        return;
    }

    licensePlates.forEach((licensePlate) => {
        const row = document.createElement("tr");
        addCell(row, licensePlate.stationNumber);
        addCell(row, licensePlate.licensePlate);
        addCell(row, licensePlate.customer?.customerName);

        const actionsCell = document.createElement("td");
        actionsCell.className = "actions-column";
        actionsCell.append(createLicensePlateActionButtons(licensePlate.id));
        row.append(actionsCell);
        licensePlateTableBody.append(row);
    });
}

function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value || "-";
    row.append(cell);
}

function renderEmptyState(message) {
    const row = document.createElement("tr");
    row.className = "empty-state";

    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.textContent = message;
    row.append(cell);
    licensePlateTableBody.append(row);
}

function createLicensePlateActionButtons(licensePlateId) {
    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.append(
        createActionButton("edit", licensePlateId, "Kennzeichen bearbeiten", "Icons/pen-to-square-regular-full.svg"),
        createActionButton("delete", licensePlateId, "Kennzeichen löschen", "Icons/trash-can-regular-full.svg")
    );
    return actions;
}

function createActionButton(action, licensePlateId, label, iconPath) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `icon-button ${action}`;
    button.dataset.licensePlateAction = action;
    button.dataset.licensePlateId = String(licensePlateId);
    button.setAttribute("aria-label", label);
    button.title = label;

    // Feste Inline-Maße halten die SVG-Icons auch bei einer alten CSS-Kopie klein.
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
function searchLicensePlates() {
    window.clearTimeout(searchDelayId);
    searchDelayId = window.setTimeout(() => {
        loadLicensePlates().catch(handleLicensePlateError);
    }, 250);
}

// Formular öffnen
async function openLicensePlateModal(licensePlate = null) {
    licensePlateForm.reset();
    document.getElementById("license-plate-id").value = "";
    document.getElementById("license-plate-modal-title").textContent = licensePlate
        ? "Kennzeichen bearbeiten"
        : "Neues Kennzeichen";

    licensePlateModal.showModal();
    customerSelect.disabled = true;
    customerSelect.replaceChildren(createCustomerOption("", "Kunden werden geladen ..."));

    try {
        await loadCustomersForSelect(licensePlate?.customer?.id);

        if (licensePlate) {
            document.getElementById("license-plate-id").value = licensePlate.id;
            document.getElementById("station-number").value = licensePlate.stationNumber || "";
            document.getElementById("license-plate-number").value = licensePlate.licensePlate || "";
        }

        document.getElementById("station-number").focus();
    } catch (error) {
        handleLicensePlateError(error);
    }
}

async function loadCustomersForSelect(selectedCustomerId = "") {
    const response = await request(`${CUSTOMER_API_URL}/page?page=0&size=1000&sort=customerName,asc`);
    const customerPage = await response.json();

    customerSelect.replaceChildren(createCustomerOption("", "Kunde auswählen"));
    customerPage.content.forEach((customer) => {
        customerSelect.append(createCustomerOption(customer.id, customer.customerName));
    });
    customerSelect.value = selectedCustomerId ? String(selectedCustomerId) : "";
    customerSelect.disabled = false;
}

function createCustomerOption(value, label) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = label;
    return option;
}

// Formular schliessen
function closeLicensePlateModal() {
    licensePlateModal.close();
}

// CSV-Import öffnen und den vorherigen Zustand verwerfen
function openLicensePlateImportDialog() {
    resetLicensePlateImport();
    licensePlateImportDialog.showModal();
}

function closeLicensePlateImportDialog() {
    licensePlateImportDialog.close();
}

function handleLicensePlateImportBackdropClick(event) {
    if (event.target === licensePlateImportDialog) {
        closeLicensePlateImportDialog();
    }
}

function resetLicensePlateImport() {
    selectedLicensePlateCsvFile = null;
    selectedLicensePlateCsvRecords = [];
    licensePlateImportFileInput.value = "";
    licensePlateImportButton.disabled = true;
    licensePlateImportButton.textContent = "Importieren";
    document.getElementById("license-plate-import-file-name").textContent = "Keine Datei ausgewählt";
    document.getElementById("license-plate-csv-preview-body").replaceChildren();
    document.getElementById("license-plate-csv-record-count").textContent = "";
    document.getElementById("license-plate-csv-preview").hidden = true;
}

// CSV-Datei nur für die Vorschau lesen; der Upload erfolgt erst nach Bestätigung.
async function handleLicensePlateCsvFileSelection() {
    const file = licensePlateImportFileInput.files[0];
    resetLicensePlateCsvPreview();

    if (!file) {
        return;
    }

    document.getElementById("license-plate-import-file-name").textContent = file.name;
    if (!file.name.toLocaleLowerCase("de-DE").endsWith(".csv")) {
        rejectLicensePlateCsvFile("Bitte wählen Sie eine Datei mit der Endung .csv aus.");
        return;
    }

    try {
        const records = parseLicensePlateCsv(await readLicensePlateCsvFile(file));
        selectedLicensePlateCsvFile = file;
        selectedLicensePlateCsvRecords = records;
        renderLicensePlateCsvPreview(records);
        licensePlateImportButton.disabled = false;
    } catch (error) {
        rejectLicensePlateCsvFile(error instanceof Error ? error.message : "Die CSV-Datei ist ungültig.");
    }
}

function resetLicensePlateCsvPreview() {
    selectedLicensePlateCsvFile = null;
    selectedLicensePlateCsvRecords = [];
    licensePlateImportButton.disabled = true;
    document.getElementById("license-plate-csv-preview-body").replaceChildren();
    document.getElementById("license-plate-csv-record-count").textContent = "";
    document.getElementById("license-plate-csv-preview").hidden = true;
}

function rejectLicensePlateCsvFile(message) {
    licensePlateImportFileInput.value = "";
    document.getElementById("license-plate-import-file-name").textContent = "Keine Datei ausgewählt";
    window.showError("Ungültige CSV-Datei", message);
}

function readLicensePlateCsvFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(String(reader.result || "")));
        reader.addEventListener("error", () => reject(new Error("Die CSV-Datei konnte nicht gelesen werden.")));
        reader.readAsText(file, "UTF-8");
    });
}

function parseLicensePlateCsv(csvText) {
    const lines = csvText.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim() !== "");
    if (lines.length < 2 || splitLicensePlateCsvLine(lines[0]).length !== 3) {
        throw new Error("Die CSV-Datei muss eine Kopfzeile und drei Spalten enthalten.");
    }

    return lines.slice(1).map((line, index) => {
        const fields = splitLicensePlateCsvLine(line);
        const validStationNumber = /^\d+$/.test(fields[0]) && Number(fields[0]) > 0;
        if (fields.length !== 3 || !validStationNumber || !fields[2]) {
            throw new Error(`Datensatz ${index + 2} entspricht nicht dem erwarteten CSV-Format.`);
        }
        return [fields[0], fields[1] === "-" ? "" : fields[1], fields[2]];
    });
}

function splitLicensePlateCsvLine(line) {
    return line.split(";").map((value) => value.trim());
}

function renderLicensePlateCsvPreview(records) {
    const previewBody = document.getElementById("license-plate-csv-preview-body");
    records.slice(0, 5).forEach((record) => {
        const row = document.createElement("tr");
        record.forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value || "-";
            row.append(cell);
        });
        previewBody.append(row);
    });
    document.getElementById("license-plate-csv-record-count").textContent = `Gesamtanzahl der Datensätze: ${records.length}`;
    document.getElementById("license-plate-csv-preview").hidden = false;
}

async function importLicensePlatesFromCsv() {
    if (!selectedLicensePlateCsvFile || licensePlateImportButton.disabled) {
        return;
    }

    licensePlateImportButton.disabled = true;
    licensePlateImportButton.textContent = "Wird importiert ...";

    try {
        const missingCustomerName = await findMissingCustomerName();
        if (missingCustomerName) {
            invalidateLicensePlateImport(
                "Kunde nicht gefunden",
                `Der Kunde „${missingCustomerName}“ existiert nicht.`
            );
            return;
        }

        const importFile = createLicensePlateImportFile();
        let response = await uploadLicensePlateCsv(LICENSE_PLATE_IMPORT_API_URL, importFile);
        if (response.status === 404) {
            response = await uploadLicensePlateCsv(`${LICENSE_PLATE_API_URL}/import`, importFile);
        }
        if (!response.ok) {
            throw new Error("Import fehlgeschlagen");
        }

        closeLicensePlateImportDialog();
        await loadLicensePlates();
        window.showSuccess("Kennzeichen erfolgreich importiert.");
    } catch (_) {
        licensePlateImportButton.disabled = false;
        licensePlateImportButton.textContent = "Importieren";
        window.showError("Import fehlgeschlagen", "Die Kennzeichen konnten nicht importiert werden.");
    }
}

async function findMissingCustomerName() {
    const customers = await loadAllCustomersForImport();
    const knownCustomerNames = new Set(customers.map((customer) => normalizeCustomerName(customer.customerName)));
    const missingRecord = selectedLicensePlateCsvRecords.find(([, , customerName]) =>
        !knownCustomerNames.has(normalizeCustomerName(customerName))
    );
    return missingRecord?.[2] || null;
}

async function loadAllCustomersForImport() {
    const firstResponse = await request(`${CUSTOMER_API_URL}/page?page=0&size=1000&sort=customerName,asc`);
    const firstPage = await firstResponse.json();
    const remainingPages = await Promise.all(
        Array.from(
            { length: Math.max(0, firstPage.totalPages - 1) },
            (_, index) => request(`${CUSTOMER_API_URL}/page?page=${index + 1}&size=1000&sort=customerName,asc`)
                .then((response) => response.json())
        )
    );
    return [firstPage, ...remainingPages].flatMap((page) => page.content);
}

function normalizeCustomerName(customerName) {
    return String(customerName || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function invalidateLicensePlateImport(title, message) {
    selectedLicensePlateCsvFile = null;
    selectedLicensePlateCsvRecords = [];
    licensePlateImportFileInput.value = "";
    licensePlateImportButton.disabled = true;
    licensePlateImportButton.textContent = "Importieren";
    document.getElementById("license-plate-import-file-name").textContent = "Keine Datei ausgewählt";
    document.getElementById("license-plate-csv-preview-body").replaceChildren();
    document.getElementById("license-plate-csv-record-count").textContent = "";
    document.getElementById("license-plate-csv-preview").hidden = true;
    window.showError(title, message);
}

function uploadLicensePlateCsv(url, file) {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(url, { method: "POST", body: formData });
}

// Für den Upload werden Platzhalter-Kennzeichen als leere Spalte übertragen.
function createLicensePlateImportFile() {
    const lines = selectedLicensePlateCsvRecords.map(([stationNumber, licensePlate, customerName]) =>
        `${stationNumber};${licensePlate};${customerName}`
    );
    return new File(["Stationsnummer;Kennzeichen;Kundenname\n", lines.join("\n")], selectedLicensePlateCsvFile.name, { type: "text/csv" });
}

// Datensatz speichern
async function saveLicensePlate(event) {
    event.preventDefault();

    const stationNumber = Number(document.getElementById("station-number").value);
    const licensePlateNumber = document.getElementById("license-plate-number").value.trim();
    const customerId = Number(customerSelect.value);
    const licensePlateId = document.getElementById("license-plate-id").value;

    if (!Number.isInteger(stationNumber) || stationNumber < 1) {
        handleLicensePlateError(new Error("Bitte geben Sie eine gültige Stationsnummer ein."));
        return;
    }
    if (!Number.isInteger(customerId) || customerId < 1) {
        handleLicensePlateError(new Error("Bitte wählen Sie einen Kunden aus."));
        customerSelect.focus();
        return;
    }

    const payload = {
        stationNumber,
        licensePlate: licensePlateNumber || null,
        normalizedLicensePlate: normalizeLicensePlate(licensePlateNumber) || null,
        customer: { id: customerId }
    };

    try {
        await ensureLicensePlateIsUnique(payload, licensePlateId);

        await request(licensePlateId ? `${LICENSE_PLATE_API_URL}/${licensePlateId}` : LICENSE_PLATE_API_URL, {
            method: licensePlateId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        closeLicensePlateModal();
        await loadLicensePlates(currentPage);
        window.showSuccess(licensePlateId ? "Kennzeichen erfolgreich aktualisiert." : "Kennzeichen erfolgreich gespeichert.");
    } catch (error) {
        handleLicensePlateError(error);
    }
}

async function ensureLicensePlateIsUnique(payload, currentLicensePlateId) {
    const response = await request(`${LICENSE_PLATE_API_URL}/page?page=0&size=1000`);
    const allLicensePlates = (await response.json()).content;
    const currentId = currentLicensePlateId ? Number(currentLicensePlateId) : null;

    const duplicateStationNumber = allLicensePlates.find((entry) =>
        entry.id !== currentId && Number(entry.stationNumber) === payload.stationNumber
    );
    if (duplicateStationNumber) {
        throw new Error(`Die Stationsnummer „${payload.stationNumber}“ existiert bereits.`);
    }

    if (
        payload.normalizedLicensePlate
        && !NON_UNIQUE_LICENSE_PLATES.has(payload.normalizedLicensePlate)
    ) {
        const duplicateLicensePlate = allLicensePlates.find((entry) =>
            entry.id !== currentId && normalizeLicensePlate(entry.licensePlate) === payload.normalizedLicensePlate
        );
        if (duplicateLicensePlate) {
            throw new Error(`Das Kennzeichen „${payload.licensePlate}“ existiert bereits.`);
        }
    }
}

function normalizeLicensePlate(licensePlate) {
    return String(licensePlate || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

// Datensatz bearbeiten
function editLicensePlate(licensePlateId) {
    const licensePlate = licensePlates.find((entry) => entry.id === licensePlateId);

    if (!licensePlate) {
        handleLicensePlateError(new Error("Das ausgewählte Kennzeichen ist nicht mehr verfügbar."));
        return;
    }

    openLicensePlateModal(licensePlate);
}

// Datensatz löschen
async function deleteLicensePlate(licensePlateId) {
    const licensePlate = licensePlates.find((entry) => entry.id === licensePlateId);
    const label = licensePlate?.licensePlate || `Kennzeichen ${licensePlateId}`;

    const confirmed = await window.showConfirmation(
        "Kennzeichen löschen",
        `Möchten Sie das Kennzeichen „${label}“ wirklich löschen?`,
        "Löschen"
    );
    if (!confirmed) {
        return;
    }

    try {
        await request(`${LICENSE_PLATE_API_URL}/${licensePlateId}`, { method: "DELETE" });
        const pageAfterDelete = licensePlates.length === 1 && currentPage > 0 ? currentPage - 1 : currentPage;
        await loadLicensePlates(pageAfterDelete);
        window.showSuccess("Kennzeichen erfolgreich gelöscht.");
    } catch (error) {
        handleLicensePlateError(error);
    }
}

function handleLicensePlateAction(event) {
    const button = event.target.closest("[data-license-plate-action]");
    if (!button) {
        return;
    }

    const licensePlateId = Number(button.dataset.licensePlateId);
    if (!Number.isInteger(licensePlateId)) {
        return;
    }

    if (button.dataset.licensePlateAction === "edit") {
        editLicensePlate(licensePlateId);
    }
    if (button.dataset.licensePlateAction === "delete") {
        deleteLicensePlate(licensePlateId);
    }
}

function handlePaginationClick(event) {
    const button = event.target.closest("[data-page]");
    if (!button || button.disabled || licensePlateSearch.value.trim()) {
        return;
    }

    const requestedPage = button.dataset.page;
    if (requestedPage === "previous") {
        loadLicensePlates(currentPage - 1).catch(handleLicensePlateError);
    } else if (requestedPage === "next") {
        loadLicensePlates(currentPage + 1).catch(handleLicensePlateError);
    } else if (/^\d+$/.test(requestedPage)) {
        loadLicensePlates(Number(requestedPage) - 1).catch(handleLicensePlateError);
    }
}

// Pagination aktualisieren
function updateLicensePlatePagination() {
    const isSearching = Boolean(licensePlateSearch.value.trim());
    licensePlatePagination.replaceChildren();
    licensePlatePagination.hidden = isSearching || totalPages <= 1;

    if (licensePlatePagination.hidden) {
        return;
    }

    licensePlatePagination.append(
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

function handleLicensePlateError(error) {
    const message = error instanceof Error ? error.message : "Ein unerwarteter Fehler ist aufgetreten.";
    window.showError("Kennzeichen konnte nicht verarbeitet werden", message);
}

document.addEventListener("DOMContentLoaded", initializeLicensePlatesPage);

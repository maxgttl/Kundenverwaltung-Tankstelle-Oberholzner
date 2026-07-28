const LICENSE_PLATE_API_URL = "/licensePlate";
const CUSTOMER_API_URL = "/kunde";
const OVERVIEW_PAGE_SIZE = 10;

let overviewSearch;
let overviewTableBody;
let overviewPagination;
let overviewCustomerRecordCount;
let overviewLicensePlateRecordCount;
let overviewEntries = [];
let filteredOverviewEntries = [];
let currentOverviewPage = 0;
let totalOverviewCustomers = 0;
let totalOverviewLicensePlates = 0;
let searchDelayId;

// Seite initialisieren
function initializeOverviewPage() {
    overviewSearch = document.getElementById("overview-search");
    overviewTableBody = document.getElementById("overview-table-body");
    overviewPagination = document.getElementById("overview-pagination");
    overviewCustomerRecordCount = document.getElementById("overview-customer-record-count");
    overviewLicensePlateRecordCount = document.getElementById("overview-license-plate-record-count");

    overviewSearch.addEventListener("input", searchOverview);
    overviewPagination.addEventListener("click", handlePaginationClick);

    loadOverview().catch(handleOverviewError);
}

// Daten vom Backend laden
async function loadOverview() {
    const [licensePlates, customerPage] = await Promise.all([
        loadAllLicensePlates(),
        loadCustomerPageForCount()
    ]);

    overviewEntries = sortOverviewEntries(licensePlates);
    totalOverviewLicensePlates = overviewEntries.length;
    totalOverviewCustomers = customerPage.totalElements;
    applyOverviewFilter();
}

async function loadCustomerPageForCount() {
    const response = await request(`${CUSTOMER_API_URL}/page?page=0&size=1&sort=customerName,asc`);
    return response.json();
}

async function loadAllLicensePlates() {
    const firstResponse = await request(`${LICENSE_PLATE_API_URL}/page?page=0&size=100&sort=stationNumber,asc`);
    const firstPage = await firstResponse.json();
    const remainingRequests = Array.from(
        { length: Math.max(0, firstPage.totalPages - 1) },
        (_, index) => request(`${LICENSE_PLATE_API_URL}/page?page=${index + 1}&size=100&sort=stationNumber,asc`)
            .then((response) => response.json())
    );
    const remainingPages = await Promise.all(remainingRequests);

    return [firstPage, ...remainingPages].flatMap((page) => page.content);
}

// Kennzeichen eines Kunden gemeinsam anzeigen; innerhalb der Gruppe nach Stationsnummer sortieren.
function sortOverviewEntries(entries) {
    return entries.sort((firstEntry, secondEntry) => {
        const customerOrder = String(firstEntry.customer?.customerName || "").localeCompare(
            String(secondEntry.customer?.customerName || ""),
            "de-DE",
            { sensitivity: "base" }
        );

        return customerOrder || Number(firstEntry.stationNumber) - Number(secondEntry.stationNumber);
    });
}

// Tabelle rendern
function renderOverview() {
    const start = currentOverviewPage * OVERVIEW_PAGE_SIZE;
    const currentEntries = filteredOverviewEntries.slice(start, start + OVERVIEW_PAGE_SIZE);
    overviewTableBody.replaceChildren();

    if (currentEntries.length === 0) {
        renderEmptyState("Keine Einträge gefunden.");
        updateOverviewRecordCounts();
        updateOverviewPagination();
        return;
    }

    currentEntries.forEach((entry) => {
        const row = document.createElement("tr");
        addCell(row, entry.stationNumber);
        addCell(row, entry.customer?.customerName);
        addCell(row, entry.licensePlate);
        overviewTableBody.append(row);
    });

    updateOverviewRecordCounts();
    updateOverviewPagination();
}

function updateOverviewRecordCounts() {
    overviewCustomerRecordCount.textContent = `Gesamtanzahl Kunden: ${totalOverviewCustomers}`;
    overviewLicensePlateRecordCount.textContent = `Gesamtanzahl Kennzeichen: ${totalOverviewLicensePlates}`;
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
    cell.colSpan = 3;
    cell.textContent = message;
    row.append(cell);
    overviewTableBody.append(row);
}

// Suche ausführen
function searchOverview() {
    window.clearTimeout(searchDelayId);
    searchDelayId = window.setTimeout(() => {
        currentOverviewPage = 0;
        applyOverviewFilter();
    }, 200);
}

function applyOverviewFilter() {
    const query = normalizeSearchText(overviewSearch.value);
    filteredOverviewEntries = overviewEntries.filter((entry) => getSearchableText(entry).includes(query));
    renderOverview();
}

function getSearchableText(entry) {
    return normalizeSearchText([
        entry.stationNumber,
        entry.customer?.customerName,
        entry.licensePlate
    ].filter(Boolean).join(" "));
}

function normalizeSearchText(value) {
    return String(value || "").toLocaleLowerCase("de-DE");
}

function handlePaginationClick(event) {
    const button = event.target.closest("[data-page]");
    if (!button || button.disabled) {
        return;
    }

    const requestedPage = button.dataset.page;
    if (requestedPage === "previous") {
        currentOverviewPage--;
    } else if (requestedPage === "next") {
        currentOverviewPage++;
    } else if (/^\d+$/.test(requestedPage)) {
        currentOverviewPage = Number(requestedPage) - 1;
    }

    renderOverview();
}

// Pagination aktualisieren
function updateOverviewPagination() {
    const totalPages = Math.ceil(filteredOverviewEntries.length / OVERVIEW_PAGE_SIZE);
    overviewPagination.replaceChildren();
    overviewPagination.hidden = totalPages <= 1;

    if (overviewPagination.hidden) {
        return;
    }

    overviewPagination.append(
        createPageButton("‹", "previous", currentOverviewPage === 0, false, "Vorherige Seite"),
        ...getVisiblePages(totalPages).map((page) => createPageButton(String(page + 1), String(page + 1), false, page === currentOverviewPage)),
        createPageButton("›", "next", currentOverviewPage >= totalPages - 1, false, "Nächste Seite")
    );
}

function getVisiblePages(totalPages) {
    const start = Math.max(0, Math.min(currentOverviewPage - 1, totalPages - 3));
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

async function request(url) {
    const response = await fetch(url);
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

    return "Übersichtsdaten konnten nicht geladen werden.";
}

function handleOverviewError(error) {
    const message = error instanceof Error ? error.message : "Übersichtsdaten konnten nicht geladen werden.";
    renderEmptyState(message);
    overviewPagination.hidden = true;
    window.showError("Übersicht konnte nicht geladen werden", message);
}

document.addEventListener("DOMContentLoaded", initializeOverviewPage);

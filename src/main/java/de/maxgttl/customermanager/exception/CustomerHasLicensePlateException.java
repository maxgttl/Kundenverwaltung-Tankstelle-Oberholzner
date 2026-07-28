package de.maxgttl.customermanager.exception;

public class CustomerHasLicensePlateException extends RuntimeException {

    public CustomerHasLicensePlateException() {
        super("Kunde kann nicht gelöscht werden, da ihm noch ein Kennzeichen zugeordnet ist.");
    }
}

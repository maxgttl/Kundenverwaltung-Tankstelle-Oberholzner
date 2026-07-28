package de.maxgttl.customermanager.exception;

public class LicensePlateNotFoundException extends RuntimeException {
    public LicensePlateNotFoundException(Long id) {
        super("Das Kennzeichen mit der id '" + id + "' konnte nicht gefunden werden.");
    }
}

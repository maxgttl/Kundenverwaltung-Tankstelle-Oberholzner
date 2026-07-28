package de.maxgttl.customermanager.exception;

public class DuplicateLicensePlateException extends RuntimeException {

    public DuplicateLicensePlateException(String licensePlate) {

      super("Das Kennzeichen '" + licensePlate + "' existiert schon.");
    }
}

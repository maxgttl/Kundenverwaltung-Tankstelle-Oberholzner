package de.maxgttl.customermanager.exception;

public class DuplicateStationNumberException extends RuntimeException {

    public DuplicateStationNumberException(Long stationNumber) {
        super("Die Stationsnummer '" + stationNumber + "' existiert schon.");
    }
}

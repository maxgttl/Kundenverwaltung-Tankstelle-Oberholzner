package de.maxgttl.customermanager.exception;

public class DuplicateCustomerException extends RuntimeException {

    public DuplicateCustomerException(String companyName) {
        super("Ein Kunde mit dem Firmennamen '" + companyName + "' existiert bereits.");
    }
}

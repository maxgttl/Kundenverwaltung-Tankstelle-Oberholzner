package de.maxgttl.customermanager.exception;

public class CustomerNotFoundException extends RuntimeException {

    public CustomerNotFoundException(long id){
        super("Kunde mit der Id " + id + " nicht gefunden.");
    }

    public CustomerNotFoundException(String companyName){
        super("Kunde mit dem Namen '" + companyName + "' nicht gefunden.");
    }
}

package de.maxgttl.customermanager.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Entity
public class LicensePlate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Stationsnummer darf nicht leer sein.")
    @Column(nullable = false, unique = true)
    private Long stationNumber;

    @Column(nullable = true, unique = false)
    private String licensePlate;

    @Column(nullable = true, unique = false)
    private String normalizedLicensePlate;

    @ManyToOne(optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    @NotNull(message = "Kunde darf nicht leer sein")
    private Customer customer;

    public LicensePlate(Long stationNumber, String licensePlate, Customer customer) {
        this.stationNumber = stationNumber;
        this.licensePlate = licensePlate;
        this.customer = customer;
    }

    public LicensePlate() {

    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getStationNumber() {
        return stationNumber;
    }

    public void setStationNumber(Long stationNumber) {
        this.stationNumber = stationNumber;
    }

    public Customer getCustomer() {
        return customer;
    }

    public void setCustomer(Customer customer) {
        this.customer = customer;
    }

    public String getLicensePlate() {
        return licensePlate;
    }

    public void setLicensePlate(String licensePlate) {
        this.licensePlate = licensePlate;
    }

    public String getNormalizedLicensePlate(){ return normalizedLicensePlate; }

    public void setNormalizedLicensePlate(String normalisedLicensePlate){this.normalizedLicensePlate = normalisedLicensePlate; }
}

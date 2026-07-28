package de.maxgttl.customermanager.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

@Entity
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Der Firmenname darf nicht leer sein.")
    @Column(nullable = false, unique = true)
    private String customerName;

    @Column(nullable = false, unique = true)
    private String normalizedCustomerName;

    @Column(nullable = true, unique = false)
    private String zipCode;

    @Column(nullable = true, unique = false)
    private String city;

    @Column(nullable = true, unique = false)
    private String address;

    public Customer() {
    }

    public Customer(String customerName, String zipCode, String city, String address) {
        setCustomerName(customerName);
        this.normalizedCustomerName = customerName.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
        setZipCode(zipCode);
        setCity(city);
        setAddress(address);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String companyName) {
        this.customerName = companyName;
    }

    public String getNormalizedCustomerName(){ return normalizedCustomerName; }

    public void setNormalizedCustomerName(String normalisedCompanyName){ this.normalizedCustomerName = normalisedCompanyName; }

    public String getZipCode() {
        return zipCode;
    }

    public void setZipCode(String zipCode) {
        this.zipCode = zipCode;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getAddress(){ return address; }

    public void setAddress(String address){ this.address = address; }

}
package de.maxgttl.customermanager.service;

import de.maxgttl.customermanager.entity.Customer;
import de.maxgttl.customermanager.exception.CustomerHasLicensePlateException;
import de.maxgttl.customermanager.exception.CustomerNotFoundException;
import de.maxgttl.customermanager.exception.DuplicateCustomerException;
import de.maxgttl.customermanager.repository.CustomerRepository;
import de.maxgttl.customermanager.repository.LicensePlateRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.util.List;


@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final LicensePlateRepository licensePlateRepository;

    public CustomerService(CustomerRepository customerRepository, LicensePlateRepository licensePlateRepository) {
        this.customerRepository = customerRepository;
        this.licensePlateRepository = licensePlateRepository;
    }

    public Page<Customer> findAll(Pageable page) {
        return customerRepository.findAll(page);
    }

    public List<Customer> filterCustomers(String searchText) {
        String normalizedSearchText = searchText.replaceAll("[^A-Za-z0-9]", "").toUpperCase();

        return customerRepository
                .findByNormalizedCustomerNameContainingIgnoreCaseOrCityContainingIgnoreCaseOrZipCodeContainingIgnoreCase(
                        normalizedSearchText,
                        searchText,
                        searchText
                );
    }

    public Customer save(Customer customer) {
        String normalizedCompanyName = customer.getCustomerName().replaceAll("[^A-Za-z0-9]", "").toUpperCase();

        if (customerRepository.existsByNormalizedCustomerName(normalizedCompanyName)) {
            throw new DuplicateCustomerException(customer.getCustomerName());
        }

        customer.setNormalizedCustomerName(normalizedCompanyName);

        return customerRepository.save(customer);
    }

    public Customer update(long id, Customer newCustomerData) {
        Customer existingCustomer = customerRepository.findById(id)
                .orElseThrow(() -> new CustomerNotFoundException(id));

        String normalizedCompanyName = newCustomerData.getCustomerName().replaceAll("[^A-Za-z0-9]", "").toUpperCase();

        boolean duplicateExists =
                customerRepository.existsByNormalizedCustomerNameAndIdNot(
                        normalizedCompanyName,
                        id
                );

        if (duplicateExists) {
            throw new DuplicateCustomerException(
                    newCustomerData.getCustomerName()
            );
        }

        existingCustomer.setCustomerName(newCustomerData.getCustomerName());
        existingCustomer.setNormalizedCustomerName(normalizedCompanyName);
        existingCustomer.setZipCode(newCustomerData.getZipCode());
        existingCustomer.setCity(newCustomerData.getCity());
        existingCustomer.setAddress(newCustomerData.getAddress());

        return customerRepository.save(existingCustomer);
    }

    public void deleteById(long id) {

        Customer existingCustomer = customerRepository.findById(id)
                .orElseThrow(() ->
                        new CustomerNotFoundException(id));

        if(licensePlateRepository.existsByCustomer(existingCustomer)){
            throw new CustomerHasLicensePlateException();
        }

        customerRepository.delete(existingCustomer);
    }

    public Customer findByCustomerName(String searchText) {
        String normalizedSearchText = searchText.replaceAll("[^A-Za-z0-9]", "").toUpperCase();

        return customerRepository.findByNormalizedCustomerName(normalizedSearchText).orElseThrow(() -> new CustomerNotFoundException(searchText));
    }

    @Transactional
    public void importCustomers(MultipartFile file) throws IOException {

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {

            reader.readLine(); // Überschrift überspringen

            String line;

            System.out.println("Ich führe den Import durch!");
            while ((line = reader.readLine()) != null) {

                String[] data = line.split(";", -1);

                if (data.length < 4) {
                    continue;
                }

                System.out.println("Bin noch da");

                Customer customer = new Customer(data[0].trim(), data[1].trim(), data[2].trim(), data[3].trim());

                System.out.println("Eigentlich sollte ich funktionieren");
                save(customer);
            }
        }

    }

    public long countCustomers(){
        return customerRepository.count();
    }


}
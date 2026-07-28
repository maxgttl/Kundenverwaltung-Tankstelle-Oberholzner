package de.maxgttl.customermanager.repository;

import de.maxgttl.customermanager.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    boolean existsByNormalizedCustomerName(String companyName);

    boolean existsByNormalizedCustomerNameAndIdNot(String companyName, long id);

    List<Customer> findByNormalizedCustomerNameContainingIgnoreCaseOrCityContainingIgnoreCaseOrZipCodeContainingIgnoreCase(String companyName, String city, String zipCode);

    Optional<Customer> findByNormalizedCustomerName(String searchText);

}
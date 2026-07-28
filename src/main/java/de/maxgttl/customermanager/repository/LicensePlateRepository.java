package de.maxgttl.customermanager.repository;

import de.maxgttl.customermanager.entity.Customer;
import de.maxgttl.customermanager.entity.LicensePlate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface LicensePlateRepository extends JpaRepository<LicensePlate, Long> {

    boolean existsByCustomer(Customer customer);

    boolean existsByStationNumber(Long stationNumber);

    boolean existsByNormalizedLicensePlate(String licensePlate);

    boolean existsByStationNumberAndIdNot(Long stationNumber, Long id);

    boolean existsByNormalizedLicensePlateAndIdNot(String normalisedLicensePlate, Long id);

    List<LicensePlate> findByNormalizedLicensePlateContainingIgnoreCaseOrCustomer_NormalizedCustomerNameContainingIgnoreCase(String normalizedLicensePlate, String normalizedCustomerName);

    long countByCustomer(Customer customer);








}


package de.maxgttl.customermanager.service;

import de.maxgttl.customermanager.entity.Customer;
import de.maxgttl.customermanager.entity.LicensePlate;
import de.maxgttl.customermanager.exception.*;
import de.maxgttl.customermanager.repository.CustomerRepository;
import de.maxgttl.customermanager.repository.LicensePlateRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.List;
import java.util.Set;

@Service
public class LicensePlateService {

    private final  LicensePlateRepository licensePlateRepository;
    private final CustomerRepository customerRepository;
    private final CustomerService customerService;
    private static final Set<String> NON_UNIQUE_VALUES = Set.of("MASCHINEN", "TANKGUTSCHEINE");

    public LicensePlateService(LicensePlateRepository licensePlateRepository, CustomerRepository customerRepository ,CustomerService customerService){
        this.licensePlateRepository = licensePlateRepository;
        this.customerRepository = customerRepository;
        this.customerService = customerService;
    }

    public Page<LicensePlate> findAll(Pageable page){
        return licensePlateRepository.findAll(page);
    }

    public List<LicensePlate> filterLicensePlate(String searchText){

        String normalizedSearchText = normalizeLicensePlate(searchText);

        return licensePlateRepository.findByNormalizedLicensePlateContainingIgnoreCaseOrCustomer_NormalizedCustomerNameContainingIgnoreCase(searchText, searchText);
    }

    public LicensePlate save(LicensePlate licensePlate) {

        String normalizedLicensePlate = normalizeLicensePlate(licensePlate.getLicensePlate());

        if (requiresDuplicateCheck(normalizedLicensePlate) && licensePlateRepository.existsByNormalizedLicensePlate(normalizedLicensePlate)) {
            throw new DuplicateLicensePlateException(licensePlate.getLicensePlate());
        }

        if (licensePlateRepository.existsByStationNumber(licensePlate.getStationNumber())) {
            throw new DuplicateStationNumberException(licensePlate.getStationNumber()
            );
        }

        if (normalizedLicensePlate == null) {
            licensePlate.setLicensePlate(null);
        }

        licensePlate.setNormalizedLicensePlate(normalizedLicensePlate);

        return licensePlateRepository.save(licensePlate);
    }

    public LicensePlate update(Long id, LicensePlate newLicensePlateData) {

        LicensePlate existingLicensePlate = licensePlateRepository.findById(id).orElseThrow(() -> new LicensePlateNotFoundException(id));

        String normalizedLicensePlate = normalizeLicensePlate(newLicensePlateData.getLicensePlate());

        if (licensePlateRepository.existsByStationNumberAndIdNot(newLicensePlateData.getStationNumber(), id)) {
            throw new DuplicateStationNumberException(newLicensePlateData.getStationNumber());
        }

        if (requiresDuplicateCheck(normalizedLicensePlate) && licensePlateRepository.existsByNormalizedLicensePlateAndIdNot(normalizedLicensePlate, id)) {
            throw new DuplicateLicensePlateException(newLicensePlateData.getLicensePlate());
        }

        Customer customer = customerRepository.findById(newLicensePlateData.getCustomer().getId()).orElseThrow(() -> new CustomerNotFoundException(newLicensePlateData.getCustomer().getId()));

        existingLicensePlate.setStationNumber(newLicensePlateData.getStationNumber());

        if (normalizedLicensePlate == null) {
            existingLicensePlate.setLicensePlate(null);
        } else {
            existingLicensePlate.setLicensePlate(newLicensePlateData.getLicensePlate().trim());
        }

        existingLicensePlate.setNormalizedLicensePlate(normalizedLicensePlate);

        existingLicensePlate.setCustomer(customer);

        return licensePlateRepository.save(existingLicensePlate);
    }

    public void deleteById(long id) {
        LicensePlate existingLicensePlate = licensePlateRepository.findById(id).orElseThrow(() -> new LicensePlateNotFoundException(id));
        licensePlateRepository.delete(existingLicensePlate);
    }

    @Transactional
    public void importLicensePlate(MultipartFile file) throws IOException {
        
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream()))) {

            reader.readLine(); // Überschrift überspringen

            String line;

            while ((line = reader.readLine()) != null) {

                if (line.isBlank()) {
                    continue;
                }

                String[] data = line.split(";", -1);

                if (data.length < 3) {
                    continue;
                }

                Long stationNumber = Long.parseLong(data[0].trim());

                String licensePlateValue = data[1].trim();

                String customerName = data[2].trim();

                Customer customer = customerService.findByCustomerName(customerName);

                LicensePlate licensePlate = new LicensePlate(stationNumber, licensePlateValue.isBlank() ? null : licensePlateValue, customer);

                save(licensePlate);

            }
        }
    }

    public long countLicensePlates(){
        return licensePlateRepository.count();
    }

    public long countLicensePlatesPerCustomer(Customer customer){
        return licensePlateRepository.countByCustomer(customer);

    }

    private String normalizeLicensePlate(String licensePlate) {

        if (licensePlate == null || licensePlate.isBlank()) {
            return null;
        }

        return licensePlate.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
    }

    public boolean requiresDuplicateCheck(String normalizedLicensePlate){
        return normalizedLicensePlate != null && !NON_UNIQUE_VALUES.contains(normalizedLicensePlate);
    }


}

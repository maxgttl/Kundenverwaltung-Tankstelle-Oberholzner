package de.maxgttl.customermanager.controller;

import de.maxgttl.customermanager.entity.LicensePlate;
import de.maxgttl.customermanager.service.LicensePlateService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/licensePlate")
public class LicensePlateController {

    private final LicensePlateService licensePlateService;

    public LicensePlateController(LicensePlateService licensePlateService){
        this.licensePlateService = licensePlateService;
    }

    @GetMapping("/page")
    public Page<LicensePlate> getLicensePlatePage(
            @PageableDefault(
                    size = 10,
                    page = 0,
                    sort = {"customer.normalizedCustomerName", "stationNumber"},
                    direction = Sort.Direction.ASC)
            Pageable page){
        return licensePlateService.findAll(page);
    }

    @GetMapping("/search")
    public List<LicensePlate> filterLicensePlates(@RequestParam String search){
        return licensePlateService.filterLicensePlate(search);
    }

    @PostMapping
    public LicensePlate createLicensePlate(@Valid @RequestBody LicensePlate licensePlate){
        return licensePlateService.save(licensePlate);
    }

    @PostMapping("/import")
    public ResponseEntity<Void> importCustomers(@RequestParam("file") MultipartFile file) throws IOException {

        licensePlateService.importLicensePlate(file);

        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}")
    public LicensePlate update(@PathVariable Long id, @RequestBody @Valid LicensePlate licensePlate){
        return licensePlateService.update(id, licensePlate);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable long id){
        licensePlateService.deleteById(id);
    }
}

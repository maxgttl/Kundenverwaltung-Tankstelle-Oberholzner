package de.maxgttl.customermanager.controller;

import de.maxgttl.customermanager.entity.Customer;
import de.maxgttl.customermanager.service.CustomerService;
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
@RequestMapping("/kunde")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping("/page")
    public Page<Customer> getCustomerForPage(
            @PageableDefault(
                    page = 0,
                    size = 10,
                    sort = "customerName",
                    direction = Sort.Direction.ASC
            )
            Pageable pageable) {

        return customerService.findAll(pageable);
    }

    @GetMapping("/search")
    public List<Customer> filterCustomers(@RequestParam String text) {
        return customerService.filterCustomers(text);
    }

    @PostMapping
    public Customer createCustomer(@Valid @RequestBody Customer customer) {
        return customerService.save(customer);
    }

    @PostMapping("/import")
    public ResponseEntity<Void> importCustomers(@RequestParam("file") MultipartFile file) throws IOException {

        customerService.importCustomers(file);

        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}")
    public Customer updateCustomer(@PathVariable long id, @Valid @RequestBody Customer customer) {
        return customerService.update(id, customer);
    }


    @DeleteMapping("/{id}")
    public void deleteCustomer(@PathVariable long id) {
        customerService.deleteById(id);
    }


}
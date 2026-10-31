package com.smartcart.inventory.controller;

import com.smartcart.inventory.dto.ReservationRequest;
import com.smartcart.inventory.dto.ReservationResponse;
import com.smartcart.inventory.model.Inventory;
import com.smartcart.inventory.model.Reservation;
import com.smartcart.inventory.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class InventoryController {

    private final InventoryService inventoryService;

    @PostMapping("/reserve")
    public ResponseEntity<ReservationResponse> reserve(@Valid @RequestBody ReservationRequest request) {
        ReservationResponse response = inventoryService.reserveStock(request);
        if (response.isSuccess()) {
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } else {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
        }
    }

    @PostMapping("/confirm/{reservationId}")
    public ResponseEntity<?> confirm(@PathVariable String reservationId) {
        boolean success = inventoryService.confirmReservation(reservationId);
        return ResponseEntity.ok(Map.of("success", success, "reservationId", reservationId));
    }

    @PostMapping("/release/{reservationId}")
    public ResponseEntity<?> release(
            @PathVariable String reservationId, 
            @RequestParam(defaultValue = "MANUAL_CANCEL") String reason) {
        boolean success = inventoryService.releaseReservation(reservationId, reason);
        return ResponseEntity.ok(Map.of("success", success, "reservationId", reservationId, "reason", reason));
    }

    @GetMapping("/status/{productId}")
    public ResponseEntity<Inventory> getStatus(@PathVariable String productId) {
        return inventoryService.getProductInventory(productId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/reservations")
    public ResponseEntity<List<Reservation>> getReservations() {
        return ResponseEntity.ok(inventoryService.getAllReservations());
    }
}


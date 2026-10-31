package com.smartcart.payment.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class PaymentController {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @PostMapping("/process")
    public ResponseEntity<?> processPayment(@RequestBody Map<String, Object> request) {
        String orderId = (String) request.get("orderId");
        String reservationId = (String) request.get("reservationId");
        String paymentMethod = (String) request.getOrDefault("paymentMethod", "UPI");
        boolean simulateFailure = Boolean.TRUE.equals(request.get("simulateFailure"));

        String transactionRef = "TXN-" + paymentMethod + "-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();

        if (simulateFailure) {
            log.warn("[PAYMENT_FAILURE_SIMULATED] Payment rejected for Order {}", orderId);
            Map<String, Object> failureEvent = Map.of(
                    "orderId", orderId,
                    "reservationId", reservationId != null ? reservationId : "",
                    "reason", "CARD_DECLINED_INSUFFICIENT_FUNDS",
                    "timestamp", Instant.now().toString()
            );
            kafkaTemplate.send("payment.failed", orderId, failureEvent);

            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "status", "FAILED",
                    "transactionRef", transactionRef,
                    "message", "Payment declined by issuing bank. Reserved inventory will be released."
            ));
        }

        log.info("[PAYMENT_SUCCESS] Payment authorized successfully for Order {}", orderId);
        Map<String, Object> successEvent = Map.of(
                "orderId", orderId,
                "reservationId", reservationId != null ? reservationId : "",
                "transactionRef", transactionRef,
                "paymentMethod", paymentMethod,
                "timestamp", Instant.now().toString()
        );
        kafkaTemplate.send("payment.succeeded", orderId, successEvent);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "status", "SUCCESS",
                "transactionRef", transactionRef,
                "message", "Payment processed successfully. Order is confirmed!"
        ));
    }
}


package com.smartcart.inventory.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartcart.inventory.dto.ReservationRequest;
import com.smartcart.inventory.dto.ReservationResponse;
import com.smartcart.inventory.model.Inventory;
import com.smartcart.inventory.model.OutboxEvent;
import com.smartcart.inventory.model.Reservation;
import com.smartcart.inventory.model.ReservationStatus;
import com.smartcart.inventory.repository.InventoryRepository;
import com.smartcart.inventory.repository.OutboxEventRepository;
import com.smartcart.inventory.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final ReservationRepository reservationRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${smartcart.reservation.ttl-seconds:300}")
    private int ttlSeconds;

    /**
     * ATOMIC INVENTORY RESERVATION (Zero Overselling Engine)
     * Demonstrates safe concurrent reservation under heavy load.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ReservationResponse reserveStock(ReservationRequest request) {
        String productId = request.getProductId();
        int quantity = request.getQuantity();

        log.info("[CONCURRENCY_CHECK] User {} attempting to reserve {} units of product {}", 
                request.getUserId(), quantity, productId);

        // 1. Atomic PostgreSQL conditional update
        int rowsUpdated = inventoryRepository.reserveStockAtomic(productId, quantity);

        if (rowsUpdated == 0) {
            // Concurrency conflict or out of stock
            Inventory inv = inventoryRepository.findById(productId).orElse(null);
            int available = inv != null ? inv.getAvailableQuantity() : 0;
            log.warn("[CONCURRENCY_CONFLICT] Reservation FAILED for User {} on Product {}. Available: {}",
                    request.getUserId(), productId, available);

            return ReservationResponse.builder()
                    .success(false)
                    .productId(productId)
                    .quantity(quantity)
                    .status(ReservationStatus.AVAILABLE)
                    .availableStock(available)
                    .message("This item is currently reserved by another customer. It may become available again if their payment is not completed.")
                    .build();
        }

        // 2. Winner of atomic lock: Create unique Reservation & Order IDs
        String reservationId = "RES-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase() + "-2026";
        String orderId = (request.getOrderId() != null && !request.getOrderId().isEmpty()) 
                         ? request.getOrderId() 
                         : "ORD-" + (100000 + new Random().nextInt(900000));
        
        Instant heldAt = Instant.now();
        Instant expiresAt = heldAt.plus(Duration.ofSeconds(ttlSeconds));

        Reservation reservation = Reservation.builder()
                .id(reservationId)
                .orderId(orderId)
                .productId(productId)
                .userId(request.getUserId())
                .quantity(quantity)
                .status(ReservationStatus.HELD)
                .heldAt(heldAt)
                .expiresAt(expiresAt)
                .build();

        reservationRepository.save(reservation);

        // 3. Transactional Outbox Pattern: Save event to database within same transaction
        Map<String, Object> eventPayload = new HashMap<>();
        eventPayload.put("reservationId", reservationId);
        eventPayload.put("orderId", orderId);
        eventPayload.put("productId", productId);
        eventPayload.put("userId", request.getUserId());
        eventPayload.put("quantity", quantity);
        eventPayload.put("status", "HELD");
        eventPayload.put("heldAt", heldAt.toString());
        eventPayload.put("expiresAt", expiresAt.toString());

        try {
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .id(UUID.randomUUID().toString())
                    .aggregateType("Inventory")
                    .aggregateId(productId)
                    .eventType("InventoryReservedEvent")
                    .payload(objectMapper.writeValueAsString(eventPayload))
                    .topic("inventory.reserved")
                    .status("PENDING")
                    .build();
            outboxEventRepository.save(outboxEvent);
        } catch (Exception e) {
            log.error("Error creating outbox event", e);
        }

        log.info("[RESERVATION_SUCCESS] User {} successfully reserved {} unit(s) of product {}. Reservation ID: {}. Expires in {} seconds.",
                request.getUserId(), quantity, productId, reservationId, ttlSeconds);

        return ReservationResponse.builder()
                .success(true)
                .reservationId(reservationId)
                .orderId(orderId)
                .productId(productId)
                .quantity(quantity)
                .status(ReservationStatus.HELD)
                .heldAt(heldAt)
                .expiresAt(expiresAt)
                .remainingSeconds((long) ttlSeconds)
                .message("Item held securely. Complete payment within 5 minutes.")
                .build();
    }

    /**
     * CONFIRM RESERVATION (On Payment Success)
     */
    @Transactional
    public boolean confirmReservation(String reservationId) {
        Reservation res = reservationRepository.findById(reservationId).orElse(null);
        if (res == null || res.getStatus() != ReservationStatus.HELD) {
            log.warn("Cannot confirm reservation {}: invalid or not HELD", reservationId);
            return false;
        }

        int rows = inventoryRepository.confirmStockAtomic(res.getProductId(), res.getQuantity());
        if (rows > 0) {
            res.setStatus(ReservationStatus.CONFIRMED);
            res.setConfirmedAt(Instant.now());
            res.setReleaseReason("PAYMENT_SUCCESS");
            reservationRepository.save(res);
            log.info("[RESERVATION_CONFIRMED] Reservation {} confirmed permanently as SOLD.", reservationId);
            return true;
        }
        return false;
    }

    /**
     * RELEASE RESERVATION (On Payment Failure or Cancellation)
     */
    @Transactional
    public boolean releaseReservation(String reservationId, String reason) {
        Reservation res = reservationRepository.findById(reservationId).orElse(null);
        if (res == null || res.getStatus() != ReservationStatus.HELD) {
            log.warn("Cannot release reservation {}: not found or not HELD", reservationId);
            return false;
        }

        int rows = inventoryRepository.releaseStockAtomic(res.getProductId(), res.getQuantity());
        if (rows > 0) {
            res.setStatus(ReservationStatus.RELEASED);
            res.setReleasedAt(Instant.now());
            res.setReleaseReason(reason);
            reservationRepository.save(res);
            log.info("[STOCK_RELEASED] Reservation {} released back to AVAILABLE pool. Reason: {}", reservationId, reason);
            return true;
        }
        return false;
    }

    /**
     * 5-MINUTE RESERVATION EXPIRY REAPER (Scheduled Task)
     * Runs every 5 seconds to automatically detect expired reservations and restore stock.
     */
    @Scheduled(fixedRateString = "${smartcart.reservation.reaper-interval-ms:5000}")
    @Transactional
    public void reapExpiredReservations() {
        List<Reservation> expiredList = reservationRepository.findExpiredHeldReservations(Instant.now());
        for (Reservation res : expiredList) {
            log.info("[RESERVATION_EXPIRED] Reservation {} exceeded 5-minute TTL. Returning stock to pool.", res.getId());
            inventoryRepository.releaseStockAtomic(res.getProductId(), res.getQuantity());
            res.setStatus(ReservationStatus.EXPIRED);
            res.setReleasedAt(Instant.now());
            res.setReleaseReason("TIMEOUT_EXPIRED_5_MINUTES");
            reservationRepository.save(res);
        }
    }

    /**
     * TRANSACTIONAL OUTBOX RELAY
     * Picks up pending outbox events and dispatches them to Apache Kafka.
     */
    @Scheduled(fixedRate = 2000)
    @Transactional
    public void relayOutboxEvents() {
        List<OutboxEvent> pending = outboxEventRepository.findTop50ByStatusOrderByCreatedAtAsc("PENDING");
        for (OutboxEvent event : pending) {
            try {
                kafkaTemplate.send(event.getTopic(), event.getAggregateId(), event.getPayload());
                event.setStatus("PUBLISHED");
                event.setPublishedAt(Instant.now());
            } catch (Exception ex) {
                log.error("Failed to publish outbox event {}: {}", event.getId(), ex.getMessage());
                event.setRetryCount(event.getRetryCount() + 1);
                if (event.getRetryCount() >= 3) {
                    event.setStatus("DLQ");
                }
            }
            outboxEventRepository.save(event);
        }
    }

    public List<Reservation> getAllReservations() {
        return reservationRepository.findAll();
    }

    public Optional<Inventory> getProductInventory(String productId) {
        return inventoryRepository.findById(productId);
    }
}


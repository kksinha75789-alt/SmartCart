package com.smartcart.inventory.dto;

import com.smartcart.inventory.model.ReservationStatus;
import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReservationResponse {
    private boolean success;
    private String reservationId;
    private String orderId;
    private String productId;
    private Integer quantity;
    private ReservationStatus status;
    private Instant heldAt;
    private Instant expiresAt;
    private Long remainingSeconds;
    private Integer availableStock;
    private String message;
}


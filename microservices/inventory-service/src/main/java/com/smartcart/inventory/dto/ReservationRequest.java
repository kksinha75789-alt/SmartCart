package com.smartcart.inventory.dto;

import lombok.*;
import jakarta.validation.constraints.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReservationRequest {
    @NotBlank
    private String productId;

    @NotNull
    @Min(1)
    private Integer quantity;

    @NotBlank
    private String userId;

    private String orderId;

    private String idempotencyKey;
}


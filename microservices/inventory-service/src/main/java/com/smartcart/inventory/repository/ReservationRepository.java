package com.smartcart.inventory.repository;

import com.smartcart.inventory.model.Reservation;
import com.smartcart.inventory.model.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, String> {

    List<Reservation> findByUserId(String userId);

    List<Reservation> findByStatus(ReservationStatus status);

    Optional<Reservation> findByOrderId(String orderId);

    /**
     * Find reservations that are still HELD but have expired past their 5-minute TTL.
     */
    @Query("SELECT r FROM Reservation r WHERE r.status = 'HELD' AND r.expiresAt <= :now")
    List<Reservation> findExpiredHeldReservations(@Param("now") Instant now);
}


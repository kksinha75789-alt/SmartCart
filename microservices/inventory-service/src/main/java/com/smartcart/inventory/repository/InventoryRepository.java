package com.smartcart.inventory.repository;

import com.smartcart.inventory.model.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, String> {

    /**
     * ATOMIC INVENTORY RESERVATION (Zero Overselling Guarantee)
     * Decrements available stock and increments reserved stock ONLY IF available >= requested quantity.
     * PostgreSQL applies an exclusive row-level write lock on the target record.
     * Returns 1 if reservation acquired, 0 if out of stock or race lost.
     */
    @Modifying
    @Query(value = "UPDATE inventory SET available_quantity = available_quantity - :qty, " +
                   "reserved_quantity = reserved_quantity + :qty, " +
                   "version = version + 1, " +
                   "last_updated = CURRENT_TIMESTAMP " +
                   "WHERE product_id = :productId AND available_quantity >= :qty", 
           nativeQuery = true)
    int reserveStockAtomic(@Param("productId") String productId, @Param("qty") int qty);

    /**
     * ATOMIC CONFIRMATION (On Payment Success)
     * Converts reserved stock into permanently sold stock.
     */
    @Modifying
    @Query(value = "UPDATE inventory SET reserved_quantity = reserved_quantity - :qty, " +
                   "sold_quantity = sold_quantity + :qty, " +
                   "version = version + 1, " +
                   "last_updated = CURRENT_TIMESTAMP " +
                   "WHERE product_id = :productId AND reserved_quantity >= :qty", 
           nativeQuery = true)
    int confirmStockAtomic(@Param("productId") String productId, @Param("qty") int qty);

    /**
     * ATOMIC RELEASE / ROLLBACK (On Payment Failure or 5-Minute Expiry)
     * Releases reserved stock back to available stock.
     */
    @Modifying
    @Query(value = "UPDATE inventory SET reserved_quantity = reserved_quantity - :qty, " +
                   "available_quantity = available_quantity + :qty, " +
                   "version = version + 1, " +
                   "last_updated = CURRENT_TIMESTAMP " +
                   "WHERE product_id = :productId AND reserved_quantity >= :qty", 
           nativeQuery = true)
    int releaseStockAtomic(@Param("productId") String productId, @Param("qty") int qty);
}


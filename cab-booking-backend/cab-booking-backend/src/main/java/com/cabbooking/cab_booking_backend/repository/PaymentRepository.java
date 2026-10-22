
package com.cabbooking.cab_booking_backend.repository;

import com.cabbooking.cab_booking_backend.entity.Payment;
import com.cabbooking.cab_booking_backend.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByRideId(Long rideId);

    List<Payment> findByStatus(PaymentStatus status);
}

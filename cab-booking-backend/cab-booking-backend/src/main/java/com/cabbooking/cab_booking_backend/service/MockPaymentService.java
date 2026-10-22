
package com.cabbooking.cab_booking_backend.service;

import com.cabbooking.cab_booking_backend.entity.Payment;
import com.cabbooking.cab_booking_backend.entity.PaymentStatus;
import com.cabbooking.cab_booking_backend.entity.Ride;
import com.cabbooking.cab_booking_backend.entity.RideStatus;
import com.cabbooking.cab_booking_backend.entity.User;
import com.cabbooking.cab_booking_backend.repository.PaymentRepository;
import com.cabbooking.cab_booking_backend.repository.RideRepository;
import com.cabbooking.cab_booking_backend.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class MockPaymentService {

    private final PaymentRepository paymentRepository;
    private final RideRepository rideRepository;
    private final UserRepository userRepository;

    public MockPaymentService(
            PaymentRepository paymentRepository,
            RideRepository rideRepository,
            UserRepository userRepository) {
        this.paymentRepository = paymentRepository;
        this.rideRepository = rideRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Payment initiatePayment(
            Long rideId,
            String authenticatedEmail) {

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Ride not found"));

        verifyRideOwnership(ride, authenticatedEmail);

        if (ride.getStatus() != RideStatus.COMPLETED) {
            throw new IllegalStateException(
                    "Payment is allowed only for completed rides");
        }

        Payment existing = paymentRepository.findByRideId(rideId)
                .orElse(null);

        if (existing != null) {
            if (existing.getStatus() == PaymentStatus.SUCCESS) {
                throw new IllegalStateException(
                        "This ride has already been paid");
            }

            // Reuse an existing pending or failed payment record.
            // Failed payments must be reset to PENDING before retrying.
            if (existing.getStatus() == PaymentStatus.FAILED) {
                existing.setStatus(PaymentStatus.PENDING);
                return paymentRepository.save(existing);
            }

            return existing;
        }

        // Use the fare saved on the server-side Ride entity.
        BigDecimal amount = ride.getEstimatedFare();

        if (amount == null || amount.signum() <= 0) {
            throw new IllegalStateException(
                    "A valid estimated fare is required for payment");
        }

        Payment payment = new Payment();
        payment.setRide(ride);
        payment.setAmount(amount);
        payment.setPaymentMethod("MOCK");
        payment.setStatus(PaymentStatus.PENDING);

        return paymentRepository.save(payment);
    }

    @Transactional
    public Payment processMockPayment(
            Long paymentId,
            boolean simulateSuccess,
            String authenticatedEmail) {

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Payment not found"));

        verifyRideOwnership(payment.getRide(), authenticatedEmail);

        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new IllegalStateException(
                    "Only pending payments can be processed");
        }

        payment.setStatus(
                simulateSuccess
                        ? PaymentStatus.SUCCESS
                        : PaymentStatus.FAILED
        );

        return paymentRepository.save(payment);
    }

    @Transactional(readOnly = true)
    public Payment getPayment(
            Long paymentId,
            String authenticatedEmail) {

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Payment not found"));

        verifyRideOwnership(payment.getRide(), authenticatedEmail);

        return payment;
    }

    private void verifyRideOwnership(
            Ride ride,
            String authenticatedEmail) {

        if (authenticatedEmail == null || authenticatedEmail.isBlank()) {
            throw new AccessDeniedException(
                    "Authentication is required");
        }

        User user = userRepository.findByEmail(authenticatedEmail)
                .orElseThrow(() ->
                        new AccessDeniedException(
                                "Authenticated user not found"));

        if (ride.getRider() == null
                || !ride.getRider().getId().equals(user.getId())) {
            throw new AccessDeniedException(
                    "You are not authorized to access this ride's payment");
        }
    }

    @Transactional(readOnly = true)
    public Payment getPaymentByRideId(Long rideId, String authenticatedEmail) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));

        verifyRideOwnership(ride, authenticatedEmail);

        return paymentRepository.findByRideId(rideId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No payment record exists for this ride"
                ));
    }

}

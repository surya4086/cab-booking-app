
package com.cabbooking.cab_booking_backend.controller;

import com.cabbooking.cab_booking_backend.entity.Payment;
import com.cabbooking.cab_booking_backend.service.MockPaymentService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final MockPaymentService mockPaymentService;

    public PaymentController(MockPaymentService mockPaymentService) {
        this.mockPaymentService = mockPaymentService;
    }

    @PostMapping("/rides/{rideId}/initiate")
    public ResponseEntity<?> initiatePayment(
            @PathVariable Long rideId,
            Authentication authentication) {

        try {
            Payment payment = mockPaymentService.initiatePayment(
                    rideId, authentication.getName());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(paymentResponse(payment));

        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", e.getMessage()));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));

        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{paymentId}")
    public ResponseEntity<?> getPayment(
            @PathVariable Long paymentId,
            Authentication authentication) {

        try {
            Payment payment = mockPaymentService.getPayment(
                    paymentId, authentication.getName());

            return ResponseEntity.ok(paymentResponse(payment));

        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", e.getMessage()));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/rides/{rideId}/status")
    public ResponseEntity<?> getPaymentStatusForRide(
            @PathVariable Long rideId,
            Authentication authentication) {

        try {
            Payment payment = mockPaymentService.getPaymentByRideId(
                    rideId, authentication.getName());

            return ResponseEntity.ok(paymentResponse(payment));

        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", e.getMessage()));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    private Map<String, Object> paymentResponse(Payment payment) {
        return Map.of(
                "id", payment.getId(),
                "rideId", payment.getRide().getId(),
                "amount", payment.getAmount(),
                "status", payment.getStatus().name(),
                "paymentMethod", payment.getPaymentMethod(),
                "createdAt", payment.getCreatedAt().toString()
        );
    }
}

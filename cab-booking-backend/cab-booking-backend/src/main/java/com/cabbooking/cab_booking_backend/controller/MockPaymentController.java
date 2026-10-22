
package com.cabbooking.cab_booking_backend.controller;

import com.cabbooking.cab_booking_backend.entity.Payment;
import com.cabbooking.cab_booking_backend.service.MockPaymentService;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@Profile("mock-payments")
@RequestMapping("/api/payments")
public class MockPaymentController {

    private final MockPaymentService mockPaymentService;

    public MockPaymentController(MockPaymentService mockPaymentService) {
        this.mockPaymentService = mockPaymentService;
    }

    @PostMapping("/{paymentId}/mock-process")
    public ResponseEntity<?> processMockPayment(
            @PathVariable Long paymentId,
            @RequestParam boolean success,
            Authentication authentication) {

        Payment payment = mockPaymentService.processMockPayment(
                paymentId,
                success,
                authentication.getName()
        );

        return ResponseEntity.ok(Map.of(
                "id", payment.getId(),
                "rideId", payment.getRide().getId(),
                "amount", payment.getAmount(),
                "status", payment.getStatus().name(),
                "paymentMethod", payment.getPaymentMethod()
        ));
    }
}

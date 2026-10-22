package com.cabbooking.cab_booking_backend.controller;

import com.cabbooking.cab_booking_backend.dto.ForgotPasswordRequest;
import com.cabbooking.cab_booking_backend.dto.VerifyOtpRequest;
import com.cabbooking.cab_booking_backend.service.PasswordResetService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.cabbooking.cab_booking_backend.dto.ResetPasswordRequest;

@RestController
@RequestMapping("/api/auth")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    public PasswordResetController(PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {

        passwordResetService.requestOtp(request.email());

        // Avoid revealing whether an email is registered.
        return ResponseEntity.ok(
                "If an account exists for that email, a verification code will be sent."
        );
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<String> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request) {

        boolean verified = passwordResetService.verifyOtp(
                request.email(), request.otp()
        );

        if (!verified) {
            return ResponseEntity.badRequest()
                    .body("Invalid or expired verification code.");
        }

        return ResponseEntity.ok("Verification code confirmed.");
    }
    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        boolean reset = passwordResetService.resetPassword(
                request.email(),
                request.otp(),
                request.newPassword()
        );

        if (!reset) {
            return ResponseEntity.badRequest()
                    .body("Invalid, expired, or unverified code.");
        }

        return ResponseEntity.ok(
                "Password reset successfully. Please log in with your new password."
        );
    }
}
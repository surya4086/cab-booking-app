
package com.cabbooking.cab_booking_backend.controller;

import com.cabbooking.cab_booking_backend.dto.UserRegistrationRequest;
import com.cabbooking.cab_booking_backend.dto.UserResponse;
import com.cabbooking.cab_booking_backend.service.AuthService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;


import com.cabbooking.cab_booking_backend.dto.DriverRegistrationRequest;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.cabbooking.cab_booking_backend.dto.LoginRequest;
import com.cabbooking.cab_booking_backend.dto.LoginResponse;

import com.cabbooking.cab_booking_backend.dto.ChangePasswordRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PutMapping;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse registerRider(
            @Valid @RequestBody UserRegistrationRequest request) {

        return authService.registerRider(request);
    }

    @PostMapping("/register/driver")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse registerDriver(
            @Valid @RequestBody DriverRegistrationRequest request) {
        return authService.registerDriver(request);
    }
    @PostMapping("/login")
    @ResponseStatus(HttpStatus.OK)
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PutMapping("/change-password")
    public org.springframework.http.ResponseEntity<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication) {

        authService.changePassword(
                authentication.getName(),
                request);

        return org.springframework.http.ResponseEntity.noContent().build();
    }


}

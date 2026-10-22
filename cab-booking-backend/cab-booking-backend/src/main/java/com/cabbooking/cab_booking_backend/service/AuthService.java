
package com.cabbooking.cab_booking_backend.service;

import com.cabbooking.cab_booking_backend.dto.UserRegistrationRequest;
import com.cabbooking.cab_booking_backend.dto.UserResponse;
import com.cabbooking.cab_booking_backend.entity.User;
import com.cabbooking.cab_booking_backend.entity.UserRole;
import com.cabbooking.cab_booking_backend.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;


import com.cabbooking.cab_booking_backend.dto.DriverRegistrationRequest;
import com.cabbooking.cab_booking_backend.entity.Driver;
import com.cabbooking.cab_booking_backend.repository.DriverRepository;

import com.cabbooking.cab_booking_backend.dto.LoginRequest;
import com.cabbooking.cab_booking_backend.dto.LoginResponse;
import java.util.Locale;

import com.cabbooking.cab_booking_backend.dto.ChangePasswordRequest;
import org.springframework.security.authentication.BadCredentialsException;


@Service
public class AuthService {

    private final DriverRepository driverRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(DriverRepository driverRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,JwtService jwtService) {
        this.driverRepository=driverRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public UserResponse registerRider(
            UserRegistrationRequest request) {

        String email = request.email().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "An account with this email already exists"
            );
        }

        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPasswordHash(
                passwordEncoder.encode(request.password())
        );
        user.setPhone(
                request.phone() == null
                        || request.phone().isBlank()
                        ? null : request.phone().trim()
        );
        user.setRole(UserRole.RIDER);

        User savedUser = userRepository.save(user);

        return UserResponse.from(savedUser);
    }

    @Transactional
    public UserResponse registerDriver(DriverRegistrationRequest request) {
        String email = request.email().trim().toLowerCase(java.util.Locale.ROOT);

        if (userRepository.existsByEmail(email)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT,
                    "An account with this email already exists"
            );
        }

        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setPhone(request.phone().trim());
        user.setRole(UserRole.DRIVER);

        User savedUser = userRepository.saveAndFlush(user);

        Driver driver = new Driver();
        driver.setUser(savedUser);
        driver.setLicenseNumber(request.licenseNumber().trim());
        driver.setVehicleModel(request.vehicleModel().trim());
        driver.setVehicleNumber(request.vehicleNumber().trim());
        driver.setAvailable(true);

        driverRepository.save(driver);

        return UserResponse.from(savedUser);
    }

    public LoginResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new org.springframework.security.authentication
                                .BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(
                request.password(), user.getPasswordHash())) {
            throw new org.springframework.security.authentication
                    .BadCredentialsException("Invalid email or password");
        }

        String token = jwtService.generateToken(user);

        return new LoginResponse(
                token,
                "Bearer",
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole()
        );
    }

    @Transactional
    public void changePassword(
            String email,
            ChangePasswordRequest request) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new BadCredentialsException("User not found"));

        if (!passwordEncoder.matches(
                request.currentPassword(),
                user.getPasswordHash())) {
            throw new BadCredentialsException(
                    "Current password is incorrect");
        }

        if (request.currentPassword().equals(request.newPassword())) {
            throw new IllegalArgumentException(
                    "New password must be different from current password");
        }

        user.setPasswordHash(
                passwordEncoder.encode(request.newPassword()));

        userRepository.save(user);
    }


}

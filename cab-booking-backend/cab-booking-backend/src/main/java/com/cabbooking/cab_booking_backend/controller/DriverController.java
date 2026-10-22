
package com.cabbooking.cab_booking_backend.controller;

import com.cabbooking.cab_booking_backend.dto.RideResponse;
import com.cabbooking.cab_booking_backend.service.DriverService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.cabbooking.cab_booking_backend.entity.Driver;
import com.cabbooking.cab_booking_backend.entity.User;
import com.cabbooking.cab_booking_backend.repository.DriverRepository;
import com.cabbooking.cab_booking_backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController
@RequestMapping("/api/drivers")
public class DriverController {

    private final DriverService driverService;
    private final DriverRepository driverRepository;
    private final UserRepository userRepository;

    public DriverController(DriverService driverService,
                            DriverRepository driverRepository,
                            UserRepository userRepository) {
        this.driverService = driverService;
        this.driverRepository = driverRepository;
        this.userRepository = userRepository;
    }

    // Accept a requested ride
    @PostMapping("/{driverId}/rides/{rideId}/accept")
    public RideResponse acceptRide(
            @PathVariable Long driverId,
            @PathVariable Long rideId) {

        return driverService.acceptRide(driverId, rideId);
    }

    // Get rides assigned to a driver
    @GetMapping("/{driverId}/rides")
    public List<RideResponse> getDriverRides(
            @PathVariable Long driverId) {

        return driverService.getRidesForDriver(driverId);
    }

    // Driver has arrived at the pickup location
    @PutMapping("/{driverId}/rides/{rideId}/arriving")
    public RideResponse markDriverArriving(
            @PathVariable Long driverId,
            @PathVariable Long rideId) {

        return driverService.markDriverArriving(driverId, rideId);
    }

    // Start the ride
    @PutMapping("/{driverId}/rides/{rideId}/start")
    public RideResponse startRide(
            @PathVariable Long driverId,
            @PathVariable Long rideId) {

        return driverService.startRide(driverId, rideId);
    }

    // Complete the ride
    @PutMapping("/{driverId}/rides/{rideId}/complete")
    public RideResponse completeRide(
            @PathVariable Long driverId,
            @PathVariable Long rideId) {

        return driverService.completeRide(driverId, rideId);
    }

    @PostMapping("/{driverId}/rides/{rideId}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void rejectRide(
            @PathVariable Long driverId,
            @PathVariable Long rideId) {

        driverService.rejectRide(driverId, rideId);
    }

    // Get available rides excluding rides this driver declined
    @GetMapping("/{driverId}/available-rides")
    public List<RideResponse> getAvailableRides(
            @PathVariable Long driverId) {

        return driverService.getAvailableRidesForDriver(driverId);
    }

    @GetMapping("/me")
    public Map<String, Long> getMyDriverId(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));

        Driver driver = driverRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Driver profile not found"));

        return Map.of("driverId", driver.getId());
    }

}


package com.cabbooking.cab_booking_backend.controller;

import com.cabbooking.cab_booking_backend.dto.FareResponse;
import com.cabbooking.cab_booking_backend.dto.RideRequest;
import com.cabbooking.cab_booking_backend.dto.RideResponse;
import com.cabbooking.cab_booking_backend.service.RideService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rides")
public class RideController {

    private final RideService rideService;

    public RideController(RideService rideService) {
        this.rideService = rideService;
    }

    @PostMapping("/fare-estimate")
    public FareResponse estimateFare(
            @Valid @RequestBody RideRequest request) {
        return rideService.estimateFare(request);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RideResponse createRide(
            @Valid @RequestBody RideRequest request) {
        return rideService.createRide(request);
    }

    @GetMapping("/rider/{riderId}")
    public List<RideResponse> getRidesByRider(
            @PathVariable Long riderId) {
        return rideService.getRidesByRider(riderId);
    }

    @GetMapping("/requests")
    public List<RideResponse> getRequestedRides() {
        return rideService.getRequestedRides();
    }

    @PutMapping("/rider/{riderId}/{rideId}/cancel")
    public RideResponse cancelRide(
            @PathVariable Long riderId,
            @PathVariable Long rideId) {

        return rideService.cancelRide(riderId, rideId);
    }


}

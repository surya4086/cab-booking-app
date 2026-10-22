
package com.cabbooking.cab_booking_backend.controller;

import com.cabbooking.cab_booking_backend.dto.CreateRideRatingRequest;
import com.cabbooking.cab_booking_backend.dto.RideRatingResponse;
import com.cabbooking.cab_booking_backend.service.RideRatingService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ratings")
public class RideRatingController {

    private final RideRatingService rideRatingService;

    public RideRatingController(RideRatingService rideRatingService) {
        this.rideRatingService = rideRatingService;
    }

    @PostMapping("/rides/{rideId}")
    @ResponseStatus(HttpStatus.CREATED)
    public RideRatingResponse rateRide(
            @PathVariable Long rideId,
            @Valid @RequestBody CreateRideRatingRequest request,
            Authentication authentication) {

        return rideRatingService.rateRide(
                rideId,
                authentication.getName(),
                request);
    }


    @GetMapping("/drivers/{driverId}")
    public com.cabbooking.cab_booking_backend.dto.DriverRatingSummary
    getDriverRatingSummary(@PathVariable Long driverId) {

        return rideRatingService.getDriverRatingSummary(driverId);
    }

    @GetMapping("/rides/{rideId}/status")
    public java.util.Map<String, Object> getRideRatingStatus(
            @PathVariable Long rideId,
            Authentication authentication) {

        boolean rated = rideRatingService.hasRiderRatedRide(
                rideId, authentication.getName());

        return java.util.Map.of(
                "rideId", rideId,
                "rated", rated
        );
    }

    @GetMapping("/drivers/{driverId}/reviews")
    public java.util.List<RideRatingResponse> getDriverReviews(
            @PathVariable Long driverId) {

        return rideRatingService.getDriverReviews(driverId);
    }

}

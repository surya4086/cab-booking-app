
package com.cabbooking.cab_booking_backend.dto;

import com.cabbooking.cab_booking_backend.entity.Ride;
import com.cabbooking.cab_booking_backend.entity.RideStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record RideResponse(
        Long id,
        Long riderId,
        String riderName,
        String riderPhone,
        Long driverId,
        String pickupAddress,
        String destinationAddress,
        Double pickupLatitude,
        Double pickupLongitude,
        Double destinationLatitude,
        Double destinationLongitude,
        double distanceKm,
        BigDecimal estimatedFare,
        RideStatus status,
        LocalDateTime createdAt
) {
    public static RideResponse from(Ride ride, double distanceKm) {
        return new RideResponse(
                ride.getId(),
                ride.getRider().getId(),
                ride.getRider().getFullName(),
                ride.getRider().getPhone(),
                ride.getDriver() == null
                        ? null : ride.getDriver().getId(),
                ride.getPickupAddress(),
                ride.getDestinationAddress(),
                ride.getPickupLatitude(),
                ride.getPickupLongitude(),
                ride.getDestinationLatitude(),
                ride.getDestinationLongitude(),
                distanceKm,
                ride.getEstimatedFare(),
                ride.getStatus(),
                ride.getCreatedAt()
        );
    }
}

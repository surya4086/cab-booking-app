
package com.cabbooking.cab_booking_backend.dto;

public record DriverRatingSummary(
        Long driverId,
        double averageRating,
        long totalRatings
) {
}

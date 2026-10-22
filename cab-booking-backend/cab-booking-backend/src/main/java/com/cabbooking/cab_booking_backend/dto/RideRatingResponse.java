
package com.cabbooking.cab_booking_backend.dto;

import com.cabbooking.cab_booking_backend.entity.RideRating;
import java.time.LocalDateTime;

public record RideRatingResponse(
        Long id,
        Long rideId,
        Long driverId,
        Long riderId,
        int stars,
        String comment,
        LocalDateTime createdAt
) {
    public static RideRatingResponse from(RideRating rating) {
        return new RideRatingResponse(
                rating.getId(),
                rating.getRide().getId(),
                rating.getDriver().getId(),
                rating.getRider().getId(),
                rating.getStars(),
                rating.getComment(),
                rating.getCreatedAt()
        );
    }
}

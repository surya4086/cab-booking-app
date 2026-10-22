
package com.cabbooking.cab_booking_backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record CreateRideRatingRequest(

        @Min(value = 1, message = "Rating must be at least 1 star")
        @Max(value = 5, message = "Rating cannot exceed 5 stars")
        int stars,

        @Size(max = 500, message = "Comment cannot exceed 500 characters")
        String comment

) {
}

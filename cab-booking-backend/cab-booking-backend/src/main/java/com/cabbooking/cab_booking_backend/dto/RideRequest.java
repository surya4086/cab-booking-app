
package com.cabbooking.cab_booking_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record RideRequest(
        @NotNull @Positive Long riderId,

        @NotBlank String pickupAddress,
        @NotBlank String destinationAddress,

        @NotNull Double pickupLatitude,
        @NotNull Double pickupLongitude,

        @NotNull Double destinationLatitude,
        @NotNull Double destinationLongitude
) {
}

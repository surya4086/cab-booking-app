
package com.cabbooking.cab_booking_backend.dto;

import java.math.BigDecimal;

public record FareResponse(
        double distanceKm,
        BigDecimal estimatedFare
) {
}

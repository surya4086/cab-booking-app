
package com.cabbooking.cab_booking_backend.service;

import com.cabbooking.cab_booking_backend.dto.FareResponse;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class FareService {

    private static final double BASE_FARE = 30.0;
    private static final double RATE_PER_KM = 2.0;
    private static final double MINIMUM_FARE = 40.0;
    private static final double EARTH_RADIUS_KM = 6371.0;

    public double calculateDistance(
            double lat1, double lon1,
            double lat2, double lon2) {

        validateCoordinates(lat1, lon1);
        validateCoordinates(lat2, lon2);

        double latitudeDifference =
                Math.toRadians(lat2 - lat1);
        double longitudeDifference =
                Math.toRadians(lon2 - lon1);

        double a = Math.sin(latitudeDifference / 2)
                * Math.sin(latitudeDifference / 2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(longitudeDifference / 2)
                * Math.sin(longitudeDifference / 2);

        double c = 2 * Math.atan2(
                Math.sqrt(a),
                Math.sqrt(1 - a)
        );

        return Math.round(EARTH_RADIUS_KM * c * 100.0) / 100.0;
    }

    public BigDecimal calculateFare(double distanceKm) {
        if (!Double.isFinite(distanceKm) || distanceKm < 0) {
            throw new IllegalArgumentException(
                    "Distance must be a valid non-negative number"
            );
        }

        double fare = Math.max(
                MINIMUM_FARE,
                BASE_FARE + (distanceKm * RATE_PER_KM)
        );

        return BigDecimal.valueOf(fare)
                .setScale(2, RoundingMode.HALF_UP);
    }

    public FareResponse estimateFare(
            double lat1, double lon1,
            double lat2, double lon2) {

        double distance = calculateDistance(
                lat1, lon1, lat2, lon2
        );

        return new FareResponse(
                distance,
                calculateFare(distance)
        );
    }

    private void validateCoordinates(
            double latitude, double longitude) {

        if (!Double.isFinite(latitude)
                || !Double.isFinite(longitude)
                || latitude < -90 || latitude > 90
                || longitude < -180 || longitude > 180) {

            throw new IllegalArgumentException(
                    "Invalid latitude or longitude"
            );
        }
    }
}

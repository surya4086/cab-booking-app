
package com.cabbooking.cab_booking_backend.repository;

import com.cabbooking.cab_booking_backend.entity.RideRating;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RideRatingRepository
        extends JpaRepository<RideRating, Long> {

    List<RideRating> findByDriverId(Long driverId);

    boolean existsByRideId(Long rideId);

    boolean existsByRideIdAndRiderId(Long rideId, Long riderId);
}


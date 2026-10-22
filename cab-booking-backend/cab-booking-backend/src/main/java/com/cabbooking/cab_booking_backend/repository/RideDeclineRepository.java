
package com.cabbooking.cab_booking_backend.repository;

import com.cabbooking.cab_booking_backend.entity.RideDecline;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RideDeclineRepository
        extends JpaRepository<RideDecline, Long> {

    boolean existsByRideIdAndDriverId(Long rideId, Long driverId);

    List<RideDecline> findByDriverId(Long driverId);
}

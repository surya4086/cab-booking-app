package com.cabbooking.cab_booking_backend.repository;




import com.cabbooking.cab_booking_backend.entity.Ride;

import com.cabbooking.cab_booking_backend.entity.RideStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface RideRepository extends JpaRepository<Ride, Long> {

    List<Ride> findByRiderIdOrderByCreatedAtDesc(Long riderId);

    List<Ride> findByDriverIdOrderByCreatedAtDesc(Long driverId);

    List<Ride> findByStatus(RideStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Ride r WHERE r.id = :rideId")
    Optional<Ride> findByIdForUpdate(@Param("rideId") Long rideId);

    List<Ride> findByStatusAndDriverIsNullOrderByCreatedAtDesc(
            RideStatus status);
}

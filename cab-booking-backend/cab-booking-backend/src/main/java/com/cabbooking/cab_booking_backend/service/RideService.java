
package com.cabbooking.cab_booking_backend.service;

import com.cabbooking.cab_booking_backend.dto.FareResponse;
import com.cabbooking.cab_booking_backend.dto.RideRequest;
import com.cabbooking.cab_booking_backend.dto.RideResponse;
import com.cabbooking.cab_booking_backend.entity.Ride;
import com.cabbooking.cab_booking_backend.entity.RideStatus;
import com.cabbooking.cab_booking_backend.entity.User;
import com.cabbooking.cab_booking_backend.entity.UserRole;
import com.cabbooking.cab_booking_backend.repository.RideRepository;
import com.cabbooking.cab_booking_backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.cabbooking.cab_booking_backend.entity.Driver;
import com.cabbooking.cab_booking_backend.repository.DriverRepository;

import java.util.List;

@Service
public class RideService {

    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final FareService fareService;
    private final DriverRepository driverRepository;

    public RideService(
            RideRepository rideRepository,
            UserRepository userRepository,
            FareService fareService, DriverRepository driverRepository) {
        this.rideRepository = rideRepository;
        this.userRepository = userRepository;
        this.fareService = fareService;
        this.driverRepository = driverRepository;
    }

    @Transactional
    public RideResponse createRide(RideRequest request) {

        validateCoordinates(
                request.pickupLatitude(),
                request.pickupLongitude()
        );

        validateCoordinates(
                request.destinationLatitude(),
                request.destinationLongitude()
        );

        User rider = userRepository.findById(request.riderId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Rider not found"
                ));

        if (rider.getRole() != UserRole.RIDER) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "The selected user is not a rider"
            );
        }

        FareResponse fare = fareService.estimateFare(
                request.pickupLatitude(),
                request.pickupLongitude(),
                request.destinationLatitude(),
                request.destinationLongitude()
        );

        Ride ride = new Ride();
        ride.setRider(rider);
        ride.setPickupAddress(request.pickupAddress().trim());
        ride.setDestinationAddress(
                request.destinationAddress().trim()
        );
        ride.setPickupLatitude(request.pickupLatitude());
        ride.setPickupLongitude(request.pickupLongitude());
        ride.setDestinationLatitude(
                request.destinationLatitude()
        );
        ride.setDestinationLongitude(
                request.destinationLongitude()
        );
        ride.setEstimatedFare(fare.estimatedFare());

        Ride savedRide = rideRepository.save(ride);

        return RideResponse.from(savedRide, fare.distanceKm());
    }

    @Transactional(readOnly = true)
    public FareResponse estimateFare(RideRequest request) {
        validateCoordinates(
                request.pickupLatitude(),
                request.pickupLongitude()
        );
        validateCoordinates(
                request.destinationLatitude(),
                request.destinationLongitude()
        );

        return fareService.estimateFare(
                request.pickupLatitude(),
                request.pickupLongitude(),
                request.destinationLatitude(),
                request.destinationLongitude()
        );
    }

    @Transactional(readOnly = true)
    public List<RideResponse> getRidesByRider(Long riderId) {

        return rideRepository
                .findByRiderIdOrderByCreatedAtDesc(riderId)
                .stream()
                .map(ride -> {
                    double distance = fareService.calculateDistance(
                            ride.getPickupLatitude(),
                            ride.getPickupLongitude(),
                            ride.getDestinationLatitude(),
                            ride.getDestinationLongitude()
                    );

                    return RideResponse.from(ride, distance);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RideResponse> getRequestedRides() {

        return rideRepository.findByStatus(RideStatus.REQUESTED)
                .stream()
                .map(ride -> {
                    double distance = fareService.calculateDistance(
                            ride.getPickupLatitude(),
                            ride.getPickupLongitude(),
                            ride.getDestinationLatitude(),
                            ride.getDestinationLongitude()
                    );

                    return RideResponse.from(ride, distance);
                })
                .toList();
    }

    private void validateCoordinates(
            Double latitude, Double longitude) {

        if (latitude == null || longitude == null
                || !Double.isFinite(latitude)
                || !Double.isFinite(longitude)
                || latitude < -90 || latitude > 90
                || longitude < -180 || longitude > 180) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid pickup or destination coordinates"
            );
        }
    }
    @Transactional
    public RideResponse cancelRide(Long riderId, Long rideId) {

        Ride ride = rideRepository.findByIdForUpdate(rideId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Ride not found"));

        if (ride.getRider() == null
                || !ride.getRider().getId().equals(riderId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You can only cancel your own ride");
        }

        if (ride.getStatus() != RideStatus.REQUESTED
                && ride.getStatus() != RideStatus.ACCEPTED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This ride can no longer be cancelled");
        }

        Driver assignedDriver = ride.getDriver();

        ride.setStatus(RideStatus.CANCELLED);

        if (assignedDriver != null) {
            Driver lockedDriver = driverRepository
                    .findByIdForUpdate(assignedDriver.getId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Assigned driver not found"));

            lockedDriver.setAvailable(true);
            driverRepository.save(lockedDriver);
        }

        Ride savedRide = rideRepository.save(ride);

        double distance = fareService.calculateDistance(
                savedRide.getPickupLatitude(),
                savedRide.getPickupLongitude(),
                savedRide.getDestinationLatitude(),
                savedRide.getDestinationLongitude()
        );

        return RideResponse.from(savedRide, distance);
    }

}

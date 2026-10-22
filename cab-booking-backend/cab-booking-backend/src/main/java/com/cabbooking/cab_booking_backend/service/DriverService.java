
package com.cabbooking.cab_booking_backend.service;

import com.cabbooking.cab_booking_backend.dto.RideResponse;
import com.cabbooking.cab_booking_backend.entity.Driver;
import com.cabbooking.cab_booking_backend.entity.Ride;
import com.cabbooking.cab_booking_backend.entity.RideStatus;
import com.cabbooking.cab_booking_backend.entity.UserRole;
import com.cabbooking.cab_booking_backend.repository.DriverRepository;
import com.cabbooking.cab_booking_backend.repository.RideRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import com.cabbooking.cab_booking_backend.entity.RideDecline;
import com.cabbooking.cab_booking_backend.repository.RideDeclineRepository;

import java.util.Set;
import java.util.stream.Collectors;

@Service
public class DriverService {

    private final DriverRepository driverRepository;
    private final RideRepository rideRepository;
    private final FareService fareService;
    private final RideDeclineRepository rideDeclineRepository;

    public DriverService(
            DriverRepository driverRepository,
            RideRepository rideRepository,
            FareService fareService,
    RideDeclineRepository rideDeclineRepository) {
        this.driverRepository = driverRepository;
        this.rideRepository = rideRepository;
        this.fareService = fareService;
        this.rideDeclineRepository = rideDeclineRepository;
    }

    @Transactional
    public RideResponse acceptRide(Long driverId, Long rideId) {

        Ride ride = rideRepository.findByIdForUpdate(rideId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Ride not found"));

        Driver driver = driverRepository.findByIdForUpdate(driverId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Driver not found"));

        if (driver.getUser().getRole() != UserRole.DRIVER) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "The associated user is not a driver");
        }

        if (!driver.isAvailable()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Driver is not available");
        }

        if (ride.getStatus() != RideStatus.REQUESTED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ride is no longer available");
        }
        if (rideDeclineRepository.existsByRideIdAndDriverId(
                rideId, driverId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "You have already declined this ride");
        }

        ride.setDriver(driver);
        ride.setStatus(RideStatus.ACCEPTED);
        driver.setAvailable(false);

        rideRepository.save(ride);
        driverRepository.save(driver);

        double distance = fareService.calculateDistance(
                ride.getPickupLatitude(),
                ride.getPickupLongitude(),
                ride.getDestinationLatitude(),
                ride.getDestinationLongitude()
        );

        return RideResponse.from(ride, distance);
    }

    @Transactional(readOnly = true)
    public List<RideResponse> getRidesForDriver(Long driverId) {

        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Driver not found"));

        return rideRepository
                .findByDriverIdOrderByCreatedAtDesc(driver.getId())
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

    @Transactional
    public RideResponse markDriverArriving(Long driverId, Long rideId) {
        return updateRideStatus(
                driverId, rideId,
                RideStatus.ACCEPTED,
                RideStatus.DRIVER_ARRIVING
        );
    }

    @Transactional
    public RideResponse startRide(Long driverId, Long rideId) {
        return updateRideStatus(
                driverId, rideId,
                RideStatus.DRIVER_ARRIVING,
                RideStatus.IN_PROGRESS
        );
    }

    @Transactional
    public RideResponse completeRide(Long driverId, Long rideId) {
        RideResponse response = updateRideStatus(
                driverId, rideId,
                RideStatus.IN_PROGRESS,
                RideStatus.COMPLETED
        );

        return response;
    }

    private RideResponse updateRideStatus(
            Long driverId,
            Long rideId,
            RideStatus expectedStatus,
            RideStatus newStatus) {

        Ride ride = rideRepository.findByIdForUpdate(rideId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Ride not found"));

        Driver driver = driverRepository.findByIdForUpdate(driverId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Driver not found"));

        if (driver.getUser().getRole() != UserRole.DRIVER) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "The associated user is not a driver");
        }

        if (ride.getDriver() == null
                || !ride.getDriver().getId().equals(driverId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "This ride is not assigned to this driver");
        }

        if (ride.getStatus() != expectedStatus) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Invalid ride status transition from "
                            + ride.getStatus() + " to " + newStatus);
        }

        ride.setStatus(newStatus);

        if (newStatus == RideStatus.COMPLETED) {
            driver.setAvailable(true);
            driverRepository.save(driver);
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


    @Transactional
    public void rejectRide(Long driverId, Long rideId) {

        Ride ride = rideRepository.findByIdForUpdate(rideId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Ride not found"));

        Driver driver = driverRepository.findByIdForUpdate(driverId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Driver not found"));

        if (driver.getUser().getRole() != UserRole.DRIVER) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "The associated user is not a driver");
        }

        if (ride.getStatus() != RideStatus.REQUESTED
                || ride.getDriver() != null) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only an unassigned requested ride can be declined");
        }

        if (rideDeclineRepository.existsByRideIdAndDriverId(
                rideId, driverId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "You have already declined this ride");
        }

        RideDecline decline = new RideDecline();
        decline.setRide(ride);
        decline.setDriver(driver);

        rideDeclineRepository.save(decline);
    }


    @Transactional(readOnly = true)
    public List<RideResponse> getAvailableRidesForDriver(Long driverId) {

        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Driver not found"));

        if (driver.getUser().getRole() != UserRole.DRIVER) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "The associated user is not a driver");
        }

        Set<Long> declinedRideIds = rideDeclineRepository
                .findByDriverId(driverId)
                .stream()
                .map(decline -> decline.getRide().getId())
                .collect(Collectors.toSet());

        return rideRepository
                .findByStatusAndDriverIsNullOrderByCreatedAtDesc(
                        RideStatus.REQUESTED)
                .stream()
                .filter(ride -> !declinedRideIds.contains(ride.getId()))
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

}


package com.cabbooking.cab_booking_backend.service;

import com.cabbooking.cab_booking_backend.dto.CreateRideRatingRequest;
import com.cabbooking.cab_booking_backend.dto.RideRatingResponse;
import com.cabbooking.cab_booking_backend.entity.Driver;
import com.cabbooking.cab_booking_backend.entity.Ride;
import com.cabbooking.cab_booking_backend.entity.RideRating;
import com.cabbooking.cab_booking_backend.entity.User;
import com.cabbooking.cab_booking_backend.repository.DriverRepository;
import com.cabbooking.cab_booking_backend.repository.RideRatingRepository;
import com.cabbooking.cab_booking_backend.repository.RideRepository;
import com.cabbooking.cab_booking_backend.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RideRatingService {

    private final RideRatingRepository rideRatingRepository;
    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final DriverRepository driverRepository;

    public RideRatingService(
            RideRatingRepository rideRatingRepository,
            RideRepository rideRepository,
            UserRepository userRepository,
            DriverRepository driverRepository) {
        this.rideRatingRepository = rideRatingRepository;
        this.rideRepository = rideRepository;
        this.userRepository = userRepository;
        this.driverRepository = driverRepository;
    }

    @Transactional
    public RideRatingResponse rateRide(
            Long rideId,
            String authenticatedEmail,
            CreateRideRatingRequest request) {

        if (request.stars() < 1 || request.stars() > 5) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Rating must be between 1 and 5 stars");
        }

        User rider = userRepository.findByEmail(authenticatedEmail)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Rider not found"));

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Ride not found"));

        if (!ride.getRider().getId().equals(rider.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You can only rate rides you booked");
        }

        if (ride.getStatus() != com.cabbooking.cab_booking_backend.entity.RideStatus.COMPLETED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only completed rides can be rated");
        }

        if (ride.getDriver() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This ride has no assigned driver");
        }

        if (rideRatingRepository.existsByRideId(rideId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This ride has already been rated");
        }

        String comment = request.comment();
        if (comment != null) {
            comment = comment.trim();
            if (comment.isEmpty()) {
                comment = null;
            }
            if (comment != null && comment.length() > 500) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Comment cannot exceed 500 characters");
            }
        }

        RideRating rating = new RideRating();
        rating.setRide(ride);
        rating.setRider(rider);
        rating.setDriver(ride.getDriver());
        rating.setStars(request.stars());
        rating.setComment(comment);

        RideRating saved = rideRatingRepository.save(rating);
        return RideRatingResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public com.cabbooking.cab_booking_backend.dto.DriverRatingSummary
    getDriverRatingSummary(Long driverId) {

        if (!driverRepository.existsById(driverId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Driver not found");
        }

        var ratings = rideRatingRepository.findByDriverId(driverId);

        double averageRating = ratings.stream()
                .mapToInt(rating -> rating.getStars())
                .average()
                .orElse(0.0);

        return new com.cabbooking.cab_booking_backend.dto.DriverRatingSummary(
                driverId,
                Math.round(averageRating * 100.0) / 100.0,
                ratings.size()
        );
    }

    @Transactional(readOnly = true)
    public boolean hasRiderRatedRide(Long rideId, String authenticatedEmail) {
        User rider = userRepository.findByEmail(authenticatedEmail)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Rider not found"));

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Ride not found"));

        if (!ride.getRider().getId().equals(rider.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You can only check ratings for your own rides");
        }

        return rideRatingRepository.existsByRideIdAndRiderId(
                rideId, rider.getId());
    }

    @Transactional(readOnly = true)
    public java.util.List<RideRatingResponse> getDriverReviews(Long driverId) {

        if (!driverRepository.existsById(driverId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Driver not found"
            );
        }

        return rideRatingRepository.findByDriverId(driverId)
                .stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(RideRatingResponse::from)
                .toList();
    }

}

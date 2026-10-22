
package com.cabbooking.cab_booking_backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "ride_ratings",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_ride_rating_ride",
                        columnNames = "ride_id"
                )
        }
)
public class RideRating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "ride_id", nullable = false, unique = true)
    private Ride ride;

    @ManyToOne(optional = false)
    @JoinColumn(name = "driver_id", nullable = false)
    private Driver driver;

    @ManyToOne(optional = false)
    @JoinColumn(name = "rider_id", nullable = false)
    private User rider;

    @Column(nullable = false)
    private int stars;

    @Column(length = 500)
    private String comment;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public RideRating() {
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public Ride getRide() { return ride; }
    public Driver getDriver() { return driver; }
    public User getRider() { return rider; }
    public int getStars() { return stars; }
    public String getComment() { return comment; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setRide(Ride ride) { this.ride = ride; }
    public void setDriver(Driver driver) { this.driver = driver; }
    public void setRider(User rider) { this.rider = rider; }
    public void setStars(int stars) { this.stars = stars; }
    public void setComment(String comment) { this.comment = comment; }
}

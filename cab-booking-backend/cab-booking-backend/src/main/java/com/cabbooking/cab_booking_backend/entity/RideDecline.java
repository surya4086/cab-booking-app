
package com.cabbooking.cab_booking_backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "ride_declines",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_ride_decline_ride_driver",
                columnNames = {"ride_id", "driver_id"}
        )
)
public class RideDecline {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "ride_id", nullable = false)
    private Ride ride;

    @ManyToOne(optional = false)
    @JoinColumn(name = "driver_id", nullable = false)
    private Driver driver;

    @Column(nullable = false)
    private LocalDateTime declinedAt;

    public RideDecline() {
    }

    @PrePersist
    public void onCreate() {
        if (declinedAt == null) {
            declinedAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public Ride getRide() {
        return ride;
    }

    public void setRide(Ride ride) {
        this.ride = ride;
    }

    public Driver getDriver() {
        return driver;
    }

    public void setDriver(Driver driver) {
        this.driver = driver;
    }

    public LocalDateTime getDeclinedAt() {
        return declinedAt;
    }
}

package com.cabbooking.cab_booking_backend.entity;


import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "rides")
public class Ride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "rider_id", nullable = false)
    private User rider;

    @ManyToOne
    @JoinColumn(name = "driver_id")
    private Driver driver;

    @Column(nullable = false)
    private String pickupAddress;

    @Column(nullable = false)
    private String destinationAddress;

    private Double pickupLatitude;
    private Double pickupLongitude;
    private Double destinationLatitude;
    private Double destinationLongitude;

    @Column(precision = 10, scale = 2)
    private BigDecimal estimatedFare;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RideStatus status = RideStatus.REQUESTED;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Ride() {
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = RideStatus.REQUESTED;
        }
    }

    public Long getId() { return id; }
    public User getRider() { return rider; }
    public Driver getDriver() { return driver; }
    public String getPickupAddress() { return pickupAddress; }
    public String getDestinationAddress() {
        return destinationAddress;
    }
    public Double getPickupLatitude() { return pickupLatitude; }
    public Double getPickupLongitude() { return pickupLongitude; }
    public Double getDestinationLatitude() {
        return destinationLatitude;
    }
    public Double getDestinationLongitude() {
        return destinationLongitude;
    }
    public BigDecimal getEstimatedFare() { return estimatedFare; }
    public RideStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setRider(User rider) { this.rider = rider; }
    public void setDriver(Driver driver) { this.driver = driver; }
    public void setPickupAddress(String address) {
        this.pickupAddress = address;
    }
    public void setDestinationAddress(String address) {
        this.destinationAddress = address;
    }
    public void setPickupLatitude(Double latitude) {
        this.pickupLatitude = latitude;
    }
    public void setPickupLongitude(Double longitude) {
        this.pickupLongitude = longitude;
    }
    public void setDestinationLatitude(Double latitude) {
        this.destinationLatitude = latitude;
    }
    public void setDestinationLongitude(Double longitude) {
        this.destinationLongitude = longitude;
    }
    public void setEstimatedFare(BigDecimal fare) {
        this.estimatedFare = fare;
    }
    public void setStatus(RideStatus status) {
        this.status = status;
    }
}

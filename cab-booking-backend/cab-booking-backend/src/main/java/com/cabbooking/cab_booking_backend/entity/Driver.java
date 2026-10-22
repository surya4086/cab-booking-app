package com.cabbooking.cab_booking_backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "drivers")
public class Driver {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false, unique = true)
    private String licenseNumber;

    private String vehicleModel;

    @Column(unique = true)
    private String vehicleNumber;

    @Column(nullable = false)
    private boolean available = true;

    public Driver() {
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getLicenseNumber() { return licenseNumber; }
    public String getVehicleModel() { return vehicleModel; }
    public String getVehicleNumber() { return vehicleNumber; }
    public boolean isAvailable() { return available; }

    public void setUser(User user) { this.user = user; }
    public void setLicenseNumber(String licenseNumber) {
        this.licenseNumber = licenseNumber;
    }
    public void setVehicleModel(String vehicleModel) {
        this.vehicleModel = vehicleModel;
    }
    public void setVehicleNumber(String vehicleNumber) {
        this.vehicleNumber = vehicleNumber;
    }
    public void setAvailable(boolean available) {
        this.available = available;
    }
}


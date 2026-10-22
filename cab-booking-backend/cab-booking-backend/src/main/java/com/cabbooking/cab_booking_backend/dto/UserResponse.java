
package com.cabbooking.cab_booking_backend.dto;

import com.cabbooking.cab_booking_backend.entity.User;
import com.cabbooking.cab_booking_backend.entity.UserRole;
import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        UserRole role,
        LocalDateTime createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getCreatedAt()
        );
    }
}

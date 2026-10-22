
package com.cabbooking.cab_booking_backend.dto;

import com.cabbooking.cab_booking_backend.entity.UserRole;

public record LoginResponse(
        String token,
        String tokenType,
        Long userId,
        String fullName,
        String email,
        UserRole role
) {
}

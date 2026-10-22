
package com.cabbooking.cab_booking_backend.service;

import com.cabbooking.cab_booking_backend.entity.PasswordResetOtp;
import com.cabbooking.cab_booking_backend.repository.PasswordResetOtpRepository;
import com.cabbooking.cab_booking_backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class PasswordResetService {

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int MAX_ATTEMPTS = 5;

    private final PasswordResetOtpRepository otpRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    private final SecureRandom secureRandom = new SecureRandom();

    public PasswordResetService(
            PasswordResetOtpRepository otpRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService) {
        this.otpRepository = otpRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    @Transactional
    public void requestOtp(String requestedEmail) {
        String email = requestedEmail.trim().toLowerCase(Locale.ROOT);

        // Do not reveal whether an account exists.
        if (!userRepository.existsByEmail(email)) {
            return;
        }

        String otp = String.format(
                "%06d", secureRandom.nextInt(1_000_000));

        // Store only the hashed OTP.
        String otpHash = passwordEncoder.encode(otp);

        otpRepository.deleteByEmail(email);

        otpRepository.deleteByEmail(email);
        otpRepository.flush();

        PasswordResetOtp resetOtp = new PasswordResetOtp(
                email,
                otpHash,
                LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES)
        );

        otpRepository.saveAndFlush(resetOtp);

        // Send only after the OTP record has been persisted.
        emailService.sendPasswordResetOtp(email, otp);
    }

    @Transactional
    public boolean verifyOtp(String requestedEmail, String otp) {
        String email = requestedEmail.trim().toLowerCase(Locale.ROOT);

        PasswordResetOtp resetOtp = otpRepository.findByEmail(email).orElse(null);

        if (resetOtp == null) {
            return false;
        }

        if (resetOtp.getVerifiedAt() != null
                || !resetOtp.getExpiresAt().isAfter(LocalDateTime.now())
                || resetOtp.getAttempts() >= MAX_ATTEMPTS) {
            otpRepository.delete(resetOtp);
            otpRepository.flush();
            return false;
        }

        if (!passwordEncoder.matches(otp, resetOtp.getOtpHash())) {
            resetOtp.setAttempts(resetOtp.getAttempts() + 1);

            if (resetOtp.getAttempts() >= MAX_ATTEMPTS) {
                otpRepository.delete(resetOtp);
            }

            otpRepository.flush();
            return false;
        }

        resetOtp.setVerifiedAt(LocalDateTime.now());
        otpRepository.saveAndFlush(resetOtp);
        return true;
    }
    @Transactional
    public boolean resetPassword(
            String requestedEmail,
            String otp,
            String newPassword) {

        String email = requestedEmail.trim().toLowerCase(Locale.ROOT);

        PasswordResetOtp resetOtp =
                otpRepository.findByEmail(email).orElse(null);

        if (resetOtp == null
                || resetOtp.getVerifiedAt() == null
                || !resetOtp.getExpiresAt().isAfter(LocalDateTime.now())
                || resetOtp.getAttempts() >= MAX_ATTEMPTS
                || !passwordEncoder.matches(otp, resetOtp.getOtpHash())) {
            return false;
        }

        var user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            otpRepository.delete(resetOtp);
            otpRepository.flush();
            return false;
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Consume the OTP so it cannot be reused.
        otpRepository.delete(resetOtp);
        otpRepository.flush();

        return true;
    }
}

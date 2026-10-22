
package com.cabbooking.cab_booking_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final String fromEmail;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${spring.mail.username}") String fromEmail) {
        this.mailSender = mailSender;
        this.fromEmail = fromEmail;
    }

    public void sendPasswordResetOtp(String recipient, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(fromEmail);
        message.setTo(recipient);
        message.setSubject("Cab Booking - Password Reset Code");
        message.setText(
                "Your password reset verification code is: " + otp
                        + "\n\nThis code expires in 5 minutes."
                        + "\nIf you did not request a password reset, ignore this email."
        );

        mailSender.send(message);
    }
}

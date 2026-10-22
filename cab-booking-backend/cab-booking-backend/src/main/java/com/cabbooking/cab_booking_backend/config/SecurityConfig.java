
package com.cabbooking.cab_booking_backend.config;

import com.cabbooking.cab_booking_backend.security.JwtAuthenticationFilter;
import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationFilter jwtAuthenticationFilter
    ) throws Exception {

        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth

                        // Allow Spring Boot to render error responses.
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers("/error").permitAll()

                        // Public authentication endpoints.
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/auth/register",
                                "/api/auth/register/driver",
                                "/api/auth/login",
                                "/api/auth/forgot-password",
                                "/api/auth/verify-otp",
                                "/api/auth/reset-password"
                        ).permitAll()

                        // Only drivers may view pending ride requests.
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/rides/requests"
                        ).hasRole("DRIVER")

                        // Rider ride history and cancellation.
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/rides/rider/**"
                        ).hasRole("RIDER")

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/rides/rider/**"
                        ).hasRole("RIDER")

                        // Only riders can estimate fares and create rides.
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/rides/fare-estimate",
                                "/api/rides"
                        ).hasRole("RIDER")

                        // Driver dashboard and ride lifecycle endpoints.
                        .requestMatchers("/api/drivers/**").hasRole("DRIVER")

                                // Payment endpoints require rider authentication.
// Ownership is additionally checked inside the controller/service.
                                .requestMatchers("/api/payments/**").hasRole("RIDER")


                                // Rating submission is restricted to authenticated riders.
                                .requestMatchers(
                                        HttpMethod.POST,
                                        "/api/ratings/rides/**"
                                ).hasRole("RIDER")

                                // Only riders can check rating status for their own rides.
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/ratings/rides/*/status"
                                ).hasRole("RIDER")

                                // Both riders and drivers can view driver rating summaries.
                                .requestMatchers(
                                        HttpMethod.GET,
                                        "/api/ratings/drivers/**"
                                ).hasAnyRole("RIDER", "DRIVER")


                                // Other ride endpoints require a valid login.
                        .requestMatchers("/api/rides/**").authenticated()

                        // User endpoints require authentication.
                        // Add stricter role/ownership checks for individual operations.
                        .requestMatchers("/api/users/**").authenticated()

                        // Change-password and all other protected endpoints.
                        .anyRequest().authenticated()
                )
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(
                List.of(
                        "http://localhost:5173",
                        "https://cab-booking-frontend-tvii.onrender.com"
                )
                );

        configuration.setAllowedMethods(
                List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        );

        configuration.setAllowedHeaders(
                List.of("Authorization", "Content-Type", "Accept")
        );

        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}

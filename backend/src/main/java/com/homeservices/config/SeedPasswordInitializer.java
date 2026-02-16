package com.homeservices.config;

import com.homeservices.repository.UserAccountRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Set;

/**
 * In dev, ensure original seed users (V2) have password "Password123!" so manual testing works.
 * Only updates known seed emails to avoid overwriting temp passwords of approved applications.
 */
@Configuration
@Profile("dev")
public class SeedPasswordInitializer {

    private static final Logger log = LoggerFactory.getLogger(SeedPasswordInitializer.class);
    private static final String SEED_PASSWORD = "Password123!";
    private static final Set<String> SEED_EMAILS = Set.of(
        "admin@demo.com", "merchant@demo.com", "worker1@demo.com", "worker2@demo.com", "user@demo.com"
    );

    @Bean
    public ApplicationRunner initSeedPasswords(UserAccountRepository userAccountRepository,
                                                PasswordEncoder passwordEncoder,
                                                @Value("${app.seed-passwords-update:true}") boolean update) {
        return args -> {
            if (!update) return;
            String hash = passwordEncoder.encode(SEED_PASSWORD);
            userAccountRepository.findAll().stream()
                .filter(a -> SEED_EMAILS.contains(a.getEmail()))
                .forEach(account -> {
                    account.setPasswordHash(hash);
                    userAccountRepository.save(account);
                    log.info("Updated seed password for {}", account.getEmail());
                });
        };
    }
}

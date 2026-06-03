package com.homeservices.service;

import com.homeservices.config.ResendProperties;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Service for sending emails via Resend.
 * <p>
 * Currently hardcodes the recipient to a fixed email address.
 * In the future, this will be changed to look up the user's email from the database.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private static final String RESEND_API_URL = "https://api.resend.com/emails";

    /**
     * Fixed recipient email — will be replaced with dynamic user lookup in the future.
     */
    private static final String FIXED_RECIPIENT = "z1596761805@gmail.com";

    private final ResendProperties resendProperties;

    private RestClient restClient;

    @PostConstruct
    public void init() {
        this.restClient = RestClient.builder()
                .baseUrl(RESEND_API_URL)
                .defaultHeader("Authorization", "Bearer " + resendProperties.getApiKey())
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * Send an HTML email to the fixed recipient.
     *
     * @param subject the email subject
     * @param htmlBody the email body as HTML
     */
    public void sendEmail(String subject, String htmlBody) {
        sendEmail(FIXED_RECIPIENT, subject, htmlBody);
    }

    /**
     * Send an HTML email to a specific recipient.
     * This method will be used in the future when recipient is dynamically resolved.
     *
     * @param to recipient email address
     * @param subject the email subject
     * @param htmlBody the email body as HTML
     */
    public void sendEmail(String to, String subject, String htmlBody) {
        if (resendProperties.getApiKey() == null || resendProperties.getApiKey().isBlank()) {
            log.warn("Resend API key is not configured. Skipping email to '{}' with subject '{}'", to, subject);
            return;
        }

        String from = "HomeServices <" + resendProperties.getFromEmail() + ">";

        Map<String, Object> requestBody = Map.of(
                "from", from,
                "to", List.of(to),
                "subject", subject,
                "html", htmlBody
        );

        try {
            String response = restClient.post()
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            log.info("Email sent successfully to '{}' with subject '{}'. Resend response: {}", to, subject, response);
        } catch (Exception e) {
            log.error("Failed to send email to '{}' with subject '{}': {}", to, subject, e.getMessage(), e);
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        }
    }

    /**
     * Send a plain-text email (converted to simple HTML) to the fixed recipient.
     *
     * @param subject the email subject
     * @param textBody the email body as plain text
     */
    public void sendSimpleEmail(String subject, String textBody) {
        String htmlBody = "<p>" + textBody.replace("\n", "<br>") + "</p>";
        sendEmail(subject, htmlBody);
    }
}

package com.homeservices.service;

import com.homeservices.config.FrontendProperties;
import com.homeservices.domain.Order;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Builds HTML email content for all notification scenarios.
 * All templates are in English and use inline CSS for email client compatibility.
 * <p>
 * URL patterns: each frontend is a separate SPA running on its own port in dev,
 * so there is NO /user/, /merchant/, or /worker/ prefix on paths.
 */
@Service
@RequiredArgsConstructor
public class EmailTemplateService {

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy 'at' h:mm a", Locale.ENGLISH);

    private static final String NZ_TIMEZONE = "Pacific/Auckland";

    private final FrontendProperties frontendProperties;

    // ──────────────────────────────────────────────
    // Scenario 1: Worker accepted the order
    // ──────────────────────────────────────────────

    public String buildWorkerAcceptedEmail(Order order) {
        String orderUrl = frontendProperties.getUserBaseUrl() + "/orders/" + order.getId();
        String scheduledTime = formatScheduledTime(order);

        return wrapEmail(
                "Your Worker Is on the Way!",
                """
                <p>Great news — your worker has <strong>accepted</strong> your order and is preparing to complete your service.</p>

                <div class="info-box">
                    <p><strong>Order:</strong> #%s</p>
                    <p><strong>Service:</strong> %s</p>
                    <p><strong>Scheduled:</strong> %s</p>
                    <p><strong>Address:</strong> %s</p>
                </div>

                <p>Your worker will arrive at the scheduled time. You can track your order anytime using the button below.</p>

                <a href="%s" class="btn">View Order Details</a>

                <p class="muted">If you have any questions or need to reschedule, please visit your order page or contact our support team.</p>
                """.formatted(
                        order.getId().toString().substring(0, 8),
                        escapeHtml(order.getServiceNameSnapshot()),
                        scheduledTime,
                        escapeHtml(order.getAddress()),
                        orderUrl
                )
        );
    }

    // ──────────────────────────────────────────────
    // Scenario 1b: OTP for worker-customer handshake
    // ──────────────────────────────────────────────

    public String buildOtpEmail(Order order) {
        String orderUrl = frontendProperties.getUserBaseUrl() + "/orders/" + order.getId();

        return wrapEmail(
                "Your Verification Code for Order #" + order.getId().toString().substring(0, 8),
                """
                <p>Your worker has <strong>accepted</strong> your order and is on the way.</p>

                <div class="info-box">
                    <p><strong>Order:</strong> #%s</p>
                    <p><strong>Service:</strong> %s</p>
                    <p><strong>Address:</strong> %s</p>
                </div>

                <div style="background:#1a1a2e;border:2px dashed #6c63ff;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
                    <p style="color:#a0a0b8;font-size:13px;margin:0 0 8px;">YOUR VERIFICATION CODE</p>
                    <p style="font-family:'Courier New',monospace;font-size:36px;font-weight:700;color:#ffffff;letter-spacing:8px;margin:0;">%s</p>
                    <p style="color:#a0a0b8;font-size:12px;margin:12px 0 0;">Share this code with your worker when they arrive.<br>This code expires in 24 hours.</p>
                </div>

                <p><strong>⚠️ Important:</strong> Only share this code with the worker who arrives at your location. Do not share it via phone, text, or email. This ensures your safety and confirms the right person is providing your service.</p>

                <a href="%s" class="btn">View Order Details</a>

                <p class="muted">If you have any questions or need to reschedule, please visit your order page or contact our support team.</p>
                """.formatted(
                        order.getId().toString().substring(0, 8),
                        escapeHtml(order.getServiceNameSnapshot()),
                        escapeHtml(order.getAddress()),
                        order.getOtpCode() != null ? order.getOtpCode() : "------",
                        orderUrl
                )
        );
    }

    // ──────────────────────────────────────────────
    // Scenario 2: Worker completed the job (proof submitted)
    // ──────────────────────────────────────────────

    public String buildOrderCompletedEmail(Order order) {
        String orderUrl = frontendProperties.getUserBaseUrl() + "/orders/" + order.getId();
        String rateUrl = frontendProperties.getUserBaseUrl() + "/ratings/create/" + order.getId();
        String complaintUrl = frontendProperties.getUserBaseUrl() + "/complaints/create/" + order.getId();

        return wrapEmail(
                "Your Service Is Complete — Please Confirm",
                """
                <p>Your worker has <strong>completed</strong> the service and submitted a completion proof.</p>

                <div class="info-box">
                    <p><strong>Order:</strong> #%s</p>
                    <p><strong>Service:</strong> %s</p>
                    <p><strong>Address:</strong> %s</p>
                </div>

                <p>Please review the work and <strong>confirm completion</strong> to close the order. Once confirmed, you can rate your experience.</p>

                <a href="%s" class="btn">Confirm &amp; Review Order</a>

                <hr>

                <p><strong>How was your experience?</strong></p>
                <p>After confirming, you can rate the service and share your feedback:</p>
                <a href="%s" class="btn-secondary">Rate This Service</a>

                <p class="muted" style="margin-top:16px;">Not satisfied? If something went wrong, you can file a complaint and we will investigate:</p>
                <a href="%s" class="btn-outline">File a Complaint</a>
                """.formatted(
                        order.getId().toString().substring(0, 8),
                        escapeHtml(order.getServiceNameSnapshot()),
                        escapeHtml(order.getAddress()),
                        orderUrl,
                        rateUrl,
                        complaintUrl
                )
        );
    }

    // ──────────────────────────────────────────────
    // Scenario 3: User confirmed completion → CLOSED
    // ──────────────────────────────────────────────

    public String buildOrderClosedEmail(Order order) {
        String rateUrl = frontendProperties.getUserBaseUrl() + "/ratings/create/" + order.getId();
        String ordersUrl = frontendProperties.getUserBaseUrl() + "/orders";

        return wrapEmail(
                "Order Closed — Thank You!",
                """
                <p>You have <strong>confirmed</strong> the completion of your order. This order is now closed.</p>

                <div class="info-box">
                    <p><strong>Order:</strong> #%s</p>
                    <p><strong>Service:</strong> %s</p>
                    <p><strong>Address:</strong> %s</p>
                </div>

                <p>We hope you are satisfied with the service! Please take a moment to rate your experience — your feedback helps us maintain quality and helps other users choose great service providers.</p>

                <a href="%s" class="btn">Rate Your Experience</a>

                <p class="muted">Thank you for choosing <strong>HomeServices</strong>. We look forward to serving you again!</p>

                <a href="%s" class="btn-secondary">View My Orders</a>
                """.formatted(
                        order.getId().toString().substring(0, 8),
                        escapeHtml(order.getServiceNameSnapshot()),
                        escapeHtml(order.getAddress()),
                        rateUrl,
                        ordersUrl
                )
        );
    }

    // ──────────────────────────────────────────────
    // Scenario 4: Merchant adds a new worker
    // ──────────────────────────────────────────────

    public String buildWorkerCreatedEmail(String displayName, String tempPassword) {
        String loginUrl = frontendProperties.getWorkerBaseUrl() + "/login";

        return wrapEmail(
                "Your Worker Account Has Been Created!",
                """
                <p>Dear %s,</p>

                <p>A worker account has been created for you on the <strong>HomeServices</strong> platform. You can now log in and start accepting jobs.</p>

                <div class="info-box">
                    <p><strong>Email:</strong> (the email address provided by your merchant)</p>
                    <p><strong>Temporary Password:</strong> <code>%s</code></p>
                </div>

                <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>

                <a href="%s" class="btn">Log In to Worker Portal</a>

                <p class="muted">Welcome aboard! If you have any questions, please reach out to your merchant or our support team.</p>
                """.formatted(
                        escapeHtml(displayName),
                        escapeHtml(tempPassword),
                        loginUrl
                )
        );
    }

    // ──────────────────────────────────────────────
    // Scenario 5: Worker application approved (legacy)
    // ──────────────────────────────────────────────

    public String buildWorkerApplicationApprovedEmail(String fullName, String tempPassword) {
        String loginUrl = frontendProperties.getWorkerBaseUrl() + "/login";

        return wrapEmail(
                "Your Worker Application Has Been Approved!",
                """
                <p>Dear %s,</p>

                <p>Congratulations! Your application to become a <strong>worker</strong> on the HomeServices platform has been <strong>approved</strong>.</p>

                <p>You can now log in using the credentials below:</p>

                <div class="info-box">
                    <p><strong>Email:</strong> (the email address you applied with)</p>
                    <p><strong>Temporary Password:</strong> <code>%s</code></p>
                </div>

                <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>

                <a href="%s" class="btn">Log In to Worker Portal</a>

                <p class="muted">Welcome aboard! If you have any questions, please reach out to your assigned merchant or our support team.</p>
                """.formatted(
                        escapeHtml(fullName),
                        escapeHtml(tempPassword),
                        loginUrl
                )
        );
    }

    // ──────────────────────────────────────────────
    // Scenario 6: Merchant application approved
    // ──────────────────────────────────────────────

    public String buildMerchantApplicationApprovedEmail(String businessName, String tempPassword) {
        String loginUrl = frontendProperties.getMerchantBaseUrl() + "/login";

        return wrapEmail(
                "Your Merchant Application Has Been Approved!",
                """
                <p>Dear %s,</p>

                <p>Congratulations! Your merchant application for <strong>%s</strong> has been <strong>approved</strong>.</p>

                <p>You can now log in using the credentials below:</p>

                <div class="info-box">
                    <p><strong>Email:</strong> (the email address you applied with)</p>
                    <p><strong>Temporary Password:</strong> <code>%s</code></p>
                </div>

                <p><strong>Important:</strong> Please change your password after your first login for security purposes. As a merchant, you can manage workers, services, and orders from your dashboard.</p>

                <a href="%s" class="btn">Log In to Merchant Dashboard</a>

                <p class="muted">Welcome to HomeServices! If you have any questions, our support team is here to help.</p>
                """.formatted(
                        escapeHtml(businessName),
                        escapeHtml(businessName),
                        escapeHtml(tempPassword),
                        loginUrl
                )
        );
    }

    // ──────────────────────────────────────────────
    // Scenario 7: Order cancelled
    // ──────────────────────────────────────────────

    public String buildOrderCancelledEmail(Order order) {
        String orderUrl = frontendProperties.getUserBaseUrl() + "/orders/" + order.getId();

        return wrapEmail(
                "Your Order Has Been Cancelled",
                """
                <p>Your order has been <strong>cancelled</strong>.</p>

                <div class="info-box">
                    <p><strong>Order:</strong> #%s</p>
                    <p><strong>Service:</strong> %s</p>
                    <p><strong>Reason:</strong> %s</p>
                </div>

                <p>If you did not request this cancellation or believe this was done in error, please visit your order page or contact our support team.</p>

                <a href="%s" class="btn">View Order Details</a>

                <p class="muted">We apologise for any inconvenience caused.</p>
                """.formatted(
                        order.getId().toString().substring(0, 8),
                        escapeHtml(order.getServiceNameSnapshot()),
                        escapeHtml(order.getCancelReason() != null ? order.getCancelReason() : "Not specified"),
                        orderUrl
                )
        );
    }

    // ──────────────────────────────────────────────
    // HTML wrapper with responsive email styling
    // ──────────────────────────────────────────────

    private String wrapEmail(String title, String body) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>%s</title>
                </head>
                <body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Inter','Segoe UI',system-ui,-apple-system,sans-serif;">
                <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 0;">
                  <tr>
                    <td align="center">
                      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#12121a;border-radius:16px;border:1px solid #1e1e2e;max-width:600px;">
                        <!-- Header -->
                        <tr>
                          <td style="padding:32px 40px 0;text-align:center;">
                            <h1 style="color:#e1e1e6;font-size:22px;font-weight:700;margin:0;">🏠 HomeServices</h1>
                          </td>
                        </tr>
                        <!-- Title -->
                        <tr>
                          <td style="padding:24px 40px 8px;text-align:center;">
                            <h2 style="color:#e1e1e6;font-size:18px;font-weight:600;margin:0;">%s</h2>
                          </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                          <td style="padding:16px 40px 32px;">
                            <div style="color:#c4c4cc;font-size:15px;line-height:1.7;">
                              %s
                            </div>
                          </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                          <td style="padding:20px 40px 32px;border-top:1px solid #1e1e2e;text-align:center;">
                            <p style="color:#666680;font-size:12px;line-height:1.6;margin:0;">
                              This is an automated message from <strong>HomeServices</strong>.<br>
                              Please do not reply to this email. If you need help, visit our support centre.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                </body>
                </html>
                """.formatted(title, title, body);
    }

    // ──────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────

    private String formatScheduledTime(Order order) {
        try {
            ZonedDateTime nzTime = order.getScheduledAt().atZone(ZoneId.of(NZ_TIMEZONE));
            return nzTime.format(DATE_FMT) + " (NZST)";
        } catch (Exception e) {
            return order.getScheduledAt().toString();
        }
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}

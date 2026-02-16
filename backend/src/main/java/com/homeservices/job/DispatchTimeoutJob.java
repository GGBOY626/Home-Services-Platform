package com.homeservices.job;

import com.homeservices.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DispatchTimeoutJob {

    private static final Logger log = LoggerFactory.getLogger(DispatchTimeoutJob.class);

    private final OrderService orderService;

    @Scheduled(fixedDelayString = "300000", initialDelayString = "60000")
    public void run() {
        try {
            int expired = orderService.processMerchantAssignTimeouts();
            int rollback = orderService.processWorkerAcceptTimeouts();
            if (expired > 0 || rollback > 0) {
                log.info("DispatchTimeoutJob completed: merchantAssignExpired={}, workerAcceptRollback={}", expired, rollback);
            }
        } catch (Exception e) {
            log.error("DispatchTimeoutJob failed", e);
        }
    }
}

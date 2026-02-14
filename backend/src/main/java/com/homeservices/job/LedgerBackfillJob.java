package com.homeservices.job;

import com.homeservices.service.LedgerService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class LedgerBackfillJob {

    private static final Logger log = LoggerFactory.getLogger(LedgerBackfillJob.class);

    private final LedgerService ledgerService;

    @Scheduled(fixedDelayString = "300000", initialDelayString = "60000")
    public void run() {
        try {
            int created = ledgerService.backfillMissingLedgers();
            if (created > 0) {
                log.info("LedgerBackfillJob completed: created={} ledgers", created);
            }
        } catch (Exception e) {
            log.error("LedgerBackfillJob failed", e);
        }
    }
}

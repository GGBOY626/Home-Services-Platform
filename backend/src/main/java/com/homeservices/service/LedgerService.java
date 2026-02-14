package com.homeservices.service;

import com.homeservices.config.AuditLogging;
import com.homeservices.domain.*;
import com.homeservices.repository.OrderRepository;
import com.homeservices.repository.PayoutLedgerRepository;
import com.homeservices.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static com.homeservices.config.RequestIdFilter.MDC_REQUEST_ID;

@Service
@RequiredArgsConstructor
public class LedgerService {

    private final OrderRepository orderRepository;
    private final PayoutLedgerRepository ledgerRepository;
    private final FeeRuleResolver feeRuleResolver;

    /**
     * Create a payout ledger for the order when it becomes CLOSED.
     * Idempotent: if ledger already exists for orderId, does nothing.
     */
    @Transactional
    public void createLedgerForOrderIfEligible(UUID orderId) {
        long start = System.currentTimeMillis();
        if (ledgerRepository.existsByOrderId(orderId)) {
            return;
        }
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null || order.getStatus() != OrderStatus.CLOSED || order.getMerchantId() == null) {
            return;
        }
        if (order.getPriceCents() == null || order.getPriceCents() <= 0) {
            return;
        }
        int feeRateBps = feeRuleResolver.resolveFeeRateBps(order);
        int gross = order.getPriceCents();
        int fee = (int) Math.round(gross * feeRateBps / 10000.0);
        int merchantNet = gross - fee;
        Instant calculatedAt = Instant.now();
        PayoutLedger ledger = PayoutLedger.builder()
            .orderId(order.getId())
            .merchantId(order.getMerchantId())
            .grossAmountCents(gross)
            .platformFeeCents(fee)
            .merchantNetCents(merchantNet)
            .status(LedgerStatus.READY)
            .calculatedAt(calculatedAt)
            .build();
        ledger = ledgerRepository.save(ledger);
        AuditLogging.logWithActor("CREATE", "PayoutLedger", "id=" + ledger.getId() + ",orderId=" + orderId,
            "SYSTEM", null, System.currentTimeMillis() - start);
    }

    /**
     * Backfill: find CLOSED orders without a ledger and create ledgers.
     */
    @Transactional
    public int backfillMissingLedgers() {
        String prevRequestId = MDC.get(MDC_REQUEST_ID);
        MDC.put(MDC_REQUEST_ID, "SYSTEM-JOB");
        try {
            long start = System.currentTimeMillis();
            List<Order> closed = orderRepository.findByStatus(OrderStatus.CLOSED);
            int created = 0;
            for (Order order : closed) {
                if (!ledgerRepository.existsByOrderId(order.getId())) {
                    try {
                        createLedgerForOrderInBackfill(order);
                        created++;
                    } catch (Exception e) {
                        // log and continue with next
                    }
                }
            }
            AuditLogging.logWithActor("BACKFILL", "PayoutLedger", "created=" + created, "SYSTEM", null, System.currentTimeMillis() - start);
            return created;
        } finally {
            if (prevRequestId != null) MDC.put(MDC_REQUEST_ID, prevRequestId);
            else MDC.remove(MDC_REQUEST_ID);
        }
    }

    private void createLedgerForOrderInBackfill(Order order) {
        if (ledgerRepository.existsByOrderId(order.getId())) return;
        int feeRateBps = feeRuleResolver.resolveFeeRateBps(order);
        int gross = order.getPriceCents();
        int fee = (int) Math.round(gross * feeRateBps / 10000.0);
        int merchantNet = gross - fee;
        PayoutLedger ledger = PayoutLedger.builder()
            .orderId(order.getId())
            .merchantId(order.getMerchantId())
            .grossAmountCents(gross)
            .platformFeeCents(fee)
            .merchantNetCents(merchantNet)
            .status(LedgerStatus.READY)
            .calculatedAt(Instant.now())
            .build();
        ledgerRepository.save(ledger);
    }

    @Transactional
    public PayoutLedger markAsPaid(Long ledgerId, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        PayoutLedger ledger = ledgerRepository.findById(ledgerId)
            .orElseThrow(() -> new IllegalArgumentException("Ledger not found: " + ledgerId));
        if (ledger.getStatus() != LedgerStatus.READY) {
            throw new IllegalStateException("Only READY ledgers can be marked as PAID. Current: " + ledger.getStatus());
        }
        ledger.setStatus(LedgerStatus.PAID);
        ledger.setPaidAt(Instant.now());
        ledger = ledgerRepository.save(ledger);
        AuditLogging.logWithActor("UPDATE", "PayoutLedger", "id=" + ledgerId + ",status=PAID",
            principal.role().name(), principal.id().toString(), System.currentTimeMillis() - start);
        return ledger;
    }
}

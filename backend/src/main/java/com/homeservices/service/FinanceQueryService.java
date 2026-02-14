package com.homeservices.service;

import com.homeservices.config.AuditLogging;
import com.homeservices.domain.LedgerStatus;
import com.homeservices.domain.PayoutLedger;
import com.homeservices.domain.PlatformFeeRule;
import com.homeservices.dto.FinanceSummaryDTO;
import com.homeservices.dto.PayoutLedgerDTO;
import com.homeservices.dto.PlatformFeeRuleDTO;
import com.homeservices.repository.PayoutLedgerRepository;
import com.homeservices.repository.PlatformFeeRuleRepository;
import com.homeservices.security.JwtPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import static org.springframework.data.domain.Pageable.unpaged;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FinanceQueryService {

    private final PayoutLedgerRepository ledgerRepository;
    private final PlatformFeeRuleRepository feeRuleRepository;

    @Transactional(readOnly = true)
    public FinanceSummaryDTO getMerchantSummary(UUID merchantId, LedgerStatus status,
                                                LocalDate from, LocalDate to, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Instant fromInst = from != null ? from.atStartOfDay(ZoneOffset.UTC).toInstant() : LocalDate.now().minusDays(7).atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant toInst = to != null ? to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant() : Instant.now().plusSeconds(86400);
        List<PayoutLedger> list = ledgerRepository.findByMerchantIdAndFilters(merchantId, status, fromInst, toInst, unpaged()).getContent();
        long totalGross = 0, totalFee = 0, totalNet = 0;
        long paid = 0, ready = 0, pending = 0;
        for (PayoutLedger l : list) {
            totalGross += l.getGrossAmountCents();
            totalFee += l.getPlatformFeeCents();
            totalNet += l.getMerchantNetCents();
            if (l.getStatus() == LedgerStatus.PAID) paid++;
            else if (l.getStatus() == LedgerStatus.READY) ready++;
            else pending++;
        }
        AuditLogging.logRead("MerchantFinanceSummary", "merchantId=" + merchantId, "size=" + list.size(), System.currentTimeMillis() - start);
        return FinanceSummaryDTO.builder()
            .totalGrossCents(totalGross)
            .totalPlatformFeeCents(totalFee)
            .totalMerchantNetCents(totalNet)
            .ledgerCount(list.size())
            .paidCount(paid)
            .readyCount(ready)
            .breakdownByStatus(Map.of("PAID", paid, "READY", ready, "PENDING", pending))
            .build();
    }

    @Transactional(readOnly = true)
    public Page<PayoutLedgerDTO> getLedgersForMerchant(UUID merchantId, LedgerStatus status,
                                                       LocalDate from, LocalDate to,
                                                       Pageable pageable, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Instant fromInst = from != null ? from.atStartOfDay(ZoneOffset.UTC).toInstant() : Instant.EPOCH;
        Instant toInst = to != null ? to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant() : Instant.now().plusSeconds(86400 * 365);
        Page<PayoutLedger> page = ledgerRepository.findByMerchantIdAndFilters(merchantId, status, fromInst, toInst, pageable);
        AuditLogging.logRead("PayoutLedger", "merchantId=" + merchantId,
            "status=" + status + ",from=" + from + ",to=" + to + ",page=" + page.getNumber(), System.currentTimeMillis() - start);
        return page.map(this::toLedgerDTO);
    }

    @Transactional(readOnly = true)
    public FinanceSummaryDTO getAdminSummary(LocalDate from, LocalDate to, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Instant fromInst = from != null ? from.atStartOfDay(ZoneOffset.UTC).toInstant() : LocalDate.now().minusDays(30).atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant toInst = to != null ? to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant() : Instant.now().plusSeconds(86400);
        List<PayoutLedger> list = ledgerRepository.findAllInDateRange(fromInst, toInst);
        long totalGross = 0, totalFee = 0, totalNet = 0;
        long paid = 0, ready = 0, pending = 0;
        for (PayoutLedger l : list) {
            totalGross += l.getGrossAmountCents();
            totalFee += l.getPlatformFeeCents();
            totalNet += l.getMerchantNetCents();
            if (l.getStatus() == LedgerStatus.PAID) paid++;
            else if (l.getStatus() == LedgerStatus.READY) ready++;
            else pending++;
        }
        Map<String, Long> breakdown = Map.of(
            "PAID", paid,
            "READY", ready,
            "PENDING", pending
        );
        AuditLogging.logRead("FinanceSummary", "admin", "from=" + from + ",to=" + to, System.currentTimeMillis() - start);
        return FinanceSummaryDTO.builder()
            .totalGrossCents(totalGross)
            .totalPlatformFeeCents(totalFee)
            .totalMerchantNetCents(totalNet)
            .ledgerCount(list.size())
            .paidCount(paid)
            .readyCount(ready)
            .breakdownByStatus(breakdown)
            .build();
    }

    @Transactional(readOnly = true)
    public Page<PayoutLedgerDTO> getLedgersForAdmin(UUID merchantId, LedgerStatus status,
                                                    LocalDate from, LocalDate to,
                                                    Pageable pageable, JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        Instant fromInst = from != null ? from.atStartOfDay(ZoneOffset.UTC).toInstant() : Instant.EPOCH;
        Instant toInst = to != null ? to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant() : Instant.now().plusSeconds(86400 * 365);
        Page<PayoutLedger> page = ledgerRepository.findByAdminFilters(merchantId, status, fromInst, toInst, pageable);
        AuditLogging.logRead("PayoutLedger", "admin", "merchantId=" + merchantId + ",status=" + status + ",page=" + page.getNumber(), System.currentTimeMillis() - start);
        return page.map(this::toLedgerDTO);
    }

    @Transactional(readOnly = true)
    public List<PlatformFeeRuleDTO> getFeeRules(JwtPrincipal principal) {
        long start = System.currentTimeMillis();
        List<PlatformFeeRule> list = feeRuleRepository.findAllByOrderByScopeAscCategoryIdAsc();
        AuditLogging.logRead("PlatformFeeRule", "admin", "size=" + list.size(), System.currentTimeMillis() - start);
        return list.stream().map(this::toRuleDTO).collect(Collectors.toList());
    }

    private PayoutLedgerDTO toLedgerDTO(PayoutLedger l) {
        return PayoutLedgerDTO.builder()
            .id(l.getId())
            .orderId(l.getOrderId())
            .merchantId(l.getMerchantId())
            .grossAmountCents(l.getGrossAmountCents())
            .platformFeeCents(l.getPlatformFeeCents())
            .merchantNetCents(l.getMerchantNetCents())
            .status(l.getStatus())
            .calculatedAt(l.getCalculatedAt())
            .paidAt(l.getPaidAt())
            .createdAt(l.getCreatedAt())
            .build();
    }

    private PlatformFeeRuleDTO toRuleDTO(PlatformFeeRule r) {
        return PlatformFeeRuleDTO.builder()
            .id(r.getId())
            .scope(r.getScope())
            .categoryId(r.getCategoryId())
            .feeRateBps(r.getFeeRateBps())
            .isActive(r.getIsActive())
            .effectiveFrom(r.getEffectiveFrom())
            .effectiveTo(r.getEffectiveTo())
            .createdAt(r.getCreatedAt())
            .updatedAt(r.getUpdatedAt())
            .build();
    }
}

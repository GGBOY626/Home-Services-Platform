package com.homeservices.config;

/**
 * Audit action constants for persisted audit events.
 * Used with AuditEventService.record().
 */
public final class AuditActions {

    private AuditActions() {}

    public static final String AUTH_LOGIN_SUCCESS = "AUTH_LOGIN_SUCCESS";
    public static final String AUTH_LOGIN_FAILURE = "AUTH_LOGIN_FAILURE";

    public static final String ORDER_CREATE = "ORDER_CREATE";
    public static final String ORDER_ASSIGN_MERCHANT = "ORDER_ASSIGN_MERCHANT";
    public static final String ORDER_ASSIGN_WORKER = "ORDER_ASSIGN_WORKER";
    public static final String ORDER_ACCEPT = "ORDER_ACCEPT";
    public static final String ORDER_OTP_VERIFY = "ORDER_OTP_VERIFY";
    public static final String ORDER_COMPLETE_WITH_PROOF = "ORDER_COMPLETE_WITH_PROOF";
    public static final String ORDER_CONFIRM = "ORDER_CONFIRM";
    public static final String ORDER_CANCEL = "ORDER_CANCEL";
    public static final String ORDER_REJECT_MERCHANT = "ORDER_REJECT_MERCHANT";
    public static final String ORDER_REJECT_WORKER = "ORDER_REJECT_WORKER";
    public static final String ORDER_EXPIRE = "ORDER_EXPIRE";
    public static final String ORDER_ROLLBACK_WORKER_ACCEPT_TIMEOUT = "ORDER_ROLLBACK_WORKER_ACCEPT_TIMEOUT";
    public static final String ORDER_RESCHEDULE = "ORDER_RESCHEDULE";

    public static final String LEDGER_CREATE = "LEDGER_CREATE";
    public static final String LEDGER_MARK_PAID = "LEDGER_MARK_PAID";
    public static final String LEDGER_BACKFILL = "LEDGER_BACKFILL";

    public static final String COMPLAINT_CREATE = "COMPLAINT_CREATE";
    public static final String COMPLAINT_STATUS_CHANGE = "COMPLAINT_STATUS_CHANGE";
    public static final String COMPLAINT_MESSAGE = "COMPLAINT_MESSAGE";

    public static final String RATING_CREATE = "RATING_CREATE";

    public static final String WORKER_AVAILABILITY_CHANGE = "WORKER_AVAILABILITY_CHANGE";

    public static final String SYSTEM_JOB_RUN = "SYSTEM_JOB_RUN";

    public static final String AUTH_REGISTER_USER = "AUTH_REGISTER_USER";
    public static final String APPLICATION_CREATE_WORKER = "APPLICATION_CREATE_WORKER";
    public static final String APPLICATION_CREATE_MERCHANT = "APPLICATION_CREATE_MERCHANT";
    public static final String APPLICATION_APPROVE = "APPLICATION_APPROVE";
    public static final String APPLICATION_REJECT = "APPLICATION_REJECT";

    public static final String PASSWORD_CHANGED = "PASSWORD_CHANGED";
}

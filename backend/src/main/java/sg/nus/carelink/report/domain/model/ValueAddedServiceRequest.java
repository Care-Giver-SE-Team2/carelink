package sg.nus.carelink.report.domain.model;

import java.time.LocalDateTime;
import java.util.Objects;

import sg.nus.carelink.shared.error.BusinessRuleViolation;

/**
 * One value-added service request shared by UC-EL02 and UC-FM08.
 * The elder creates the row; a bound family member later approves or rejects the same row.
 */
public record ValueAddedServiceRequest(
        Long id,
        Long elderId,
        Long valueAddedServiceId,
        Long requestedByFamilyMemberId,
        Long approvingFamilyMemberId,
        Long visitId,
        LocalDateTime requestedSchedule,
        String specialInstructions,
        Status status,
        LocalDateTime decidedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public ValueAddedServiceRequest {
        Objects.requireNonNull(elderId, "elderId");
        Objects.requireNonNull(valueAddedServiceId, "valueAddedServiceId");
        Objects.requireNonNull(status, "status");
    }

    /** UC-EL02: the elder requests an available catalogue service. */
    public static ValueAddedServiceRequest requestedByElder(
            Long elderId,
            Long valueAddedServiceId,
            LocalDateTime requestedSchedule,
            String specialInstructions) {
        Objects.requireNonNull(elderId, "elderId");
        Objects.requireNonNull(valueAddedServiceId, "valueAddedServiceId");
        Objects.requireNonNull(requestedSchedule, "requestedSchedule");
        return new ValueAddedServiceRequest(
                null, elderId, valueAddedServiceId, null, null, null,
                requestedSchedule, normalise(specialInstructions), Status.PENDING_APPROVAL,
                null, null, null);
    }

    /** UC-FM08: approval creates a visit work order, so the request becomes DISPATCHED. */
    public ValueAddedServiceRequest approveAndDispatch(
            Long familyMemberId,
            Long dispatchedVisitId,
            LocalDateTime now) {
        requirePending();
        Objects.requireNonNull(familyMemberId, "familyMemberId");
        Objects.requireNonNull(dispatchedVisitId, "dispatchedVisitId");
        Objects.requireNonNull(now, "now");
        return new ValueAddedServiceRequest(
                id, elderId, valueAddedServiceId, requestedByFamilyMemberId,
                familyMemberId, dispatchedVisitId, requestedSchedule, specialInstructions,
                Status.DISPATCHED, now, createdAt, updatedAt);
    }

    /** UC-FM08: family declines the request without creating a visit. */
    public ValueAddedServiceRequest reject(Long familyMemberId, LocalDateTime now) {
        requirePending();
        Objects.requireNonNull(familyMemberId, "familyMemberId");
        Objects.requireNonNull(now, "now");
        return new ValueAddedServiceRequest(
                id, elderId, valueAddedServiceId, requestedByFamilyMemberId,
                familyMemberId, null, requestedSchedule, specialInstructions,
                Status.REJECTED, now, createdAt, updatedAt);
    }

    /**
     * Called off before it is carried out: by a manager, or because its visit was called off.
     * Only a request still waiting for the family or dispatched and not yet done can be.
     */
    public ValueAddedServiceRequest cancelled() {
        if (status != Status.PENDING_APPROVAL && status != Status.DISPATCHED) {
            throw new BusinessRuleViolation(
                    "VALUE_ADDED_SERVICE_REQUEST_CLOSED",
                    "Only a pending or dispatched value-added service request can be cancelled.");
        }
        return withStatus(Status.CANCELLED);
    }

    /** Its visit was carried out. */
    public ValueAddedServiceRequest completed() {
        if (status != Status.DISPATCHED) {
            throw new BusinessRuleViolation(
                    "VALUE_ADDED_SERVICE_REQUEST_NOT_DISPATCHED",
                    "Only a dispatched value-added service request can be completed.");
        }
        return withStatus(Status.COMPLETED);
    }

    private ValueAddedServiceRequest withStatus(Status next) {
        return new ValueAddedServiceRequest(
                id, elderId, valueAddedServiceId, requestedByFamilyMemberId,
                approvingFamilyMemberId, visitId, requestedSchedule, specialInstructions,
                next, decidedAt, createdAt, updatedAt);
    }

    private void requirePending() {
        if (status != Status.PENDING_APPROVAL) {
            throw new BusinessRuleViolation(
                    "VALUE_ADDED_SERVICE_REQUEST_ALREADY_DECIDED",
                    "Only a pending value-added service request can be decided.");
        }
    }

    private static String normalise(String text) {
        if (text == null || text.isBlank()) return null;
        return text.trim();
    }

    public enum Status {
        PENDING_APPROVAL, APPROVED, REJECTED, DISPATCHED, COMPLETED, CANCELLED
    }
}

package sg.nus.carelink.careplan.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;

import sg.nus.carelink.shared.error.BusinessRuleViolation;

/**
 * Domain model for care_plan.
 *
 * <p>identity.domain.model.AppUser is the template. Must not import JPA or Spring Data;
 * ArchUnit rejects the build if it does.
 */
public record CarePlan(
		Long id,
		Long elderId,
		Long createdByUserId,
		Long supersedesPlanId,
		Integer version,
		CarePlan.Status status,
		BigDecimal totalHours,
		LocalDateTime publishedAt,
		LocalDateTime createdAt,
		LocalDateTime updatedAt,
		LocalDate stopEffectiveDate,
		String stopReason,
		Long stoppedByUserId,
		LocalDateTime stoppedAt) {

	public CarePlan(
			Long id, Long elderId, Long createdByUserId, Long supersedesPlanId, Integer version,
			CarePlan.Status status, BigDecimal totalHours, LocalDateTime publishedAt,
			LocalDateTime createdAt, LocalDateTime updatedAt) {
		this(id, elderId, createdByUserId, supersedesPlanId, version, status, totalHours, publishedAt,
				createdAt, updatedAt, null, null, null, null);
	}

	public enum Status {
		DRAFT, PUBLISHED, SUPERSEDED, STOPPED
	}

	/**
	 * Opens a new, empty draft for an elder. An elder may have at most one open draft
	 * at a time — {@code latestForElder} (the elder's highest-version plan, or null if
	 * none exists yet) must not itself be a draft, or the manager already has one open
	 * and should keep editing it instead. The new draft is numbered one past the
	 * elder's latest plan and, when that plan is published, chains supersedesPlanId to
	 * it so the version history (screen 2a) can be read off the chain.
	 */
	public static CarePlan startDraft(Long elderId, Long createdByUserId, CarePlan latestForElder) {
		Objects.requireNonNull(elderId, "elderId");
		if (latestForElder != null && latestForElder.status() == Status.DRAFT) {
			throw new BusinessRuleViolation(
					"CARE_PLAN_DRAFT_ALREADY_OPEN",
					"Elder [%s] already has an open draft care plan".formatted(elderId));
		}
		int nextVersion = latestForElder == null ? 1 : latestForElder.version() + 1;
		Long supersedesPlanId = latestForElder != null && latestForElder.status() == Status.PUBLISHED
				? latestForElder.id()
				: null;
		return new CarePlan(
				null, elderId, createdByUserId, supersedesPlanId, nextVersion, Status.DRAFT,
				null, null, null, null);
	}

	/**
	 * Publishes this draft with the given rolled-up weekly effort (the sum of its
	 * care_plan_node rows — never entered by hand, see the schema comment on
	 * total_hours). Only a draft may be published; publishing twice, or publishing a
	 * plan that was never opened as a draft, is a business rule violation.
	 */
	public CarePlan publish(BigDecimal totalHours) {
		if (status != Status.DRAFT) {
			throw new BusinessRuleViolation(
					"CARE_PLAN_NOT_DRAFT",
					"Care plan [%s] is not a draft".formatted(id));
		}
		return new CarePlan(
				id, elderId, createdByUserId, supersedesPlanId, version, Status.PUBLISHED,
				totalHours, LocalDateTime.now(), createdAt, updatedAt);
	}

	/** Marks a previously published plan as superseded once the plan that replaces it publishes. */
	public CarePlan supersede() {
		return new CarePlan(
				id, elderId, createdByUserId, supersedesPlanId, version, Status.SUPERSEDED,
				totalHours, publishedAt, createdAt, updatedAt);
	}

	/**
	 * Ends an active plan early (screen 1n). Only a published plan can be stopped — a draft is
	 * discarded instead, and a superseded or already-stopped plan is no longer the elder's active
	 * one. The plan row and its node tree are kept; nothing is deleted, and a new plan can be
	 * drafted for the elder afterwards, same as after a normal publish.
	 */
	public CarePlan stop(LocalDate effectiveDate, String reason, Long stoppedByUserId) {
		if (status != Status.PUBLISHED) {
			throw new BusinessRuleViolation(
					"CARE_PLAN_NOT_PUBLISHED",
					"Care plan [%s] is not published".formatted(id));
		}
		Objects.requireNonNull(effectiveDate, "effectiveDate");
		if (reason == null || reason.isBlank()) {
			throw new BusinessRuleViolation(
					"CARE_PLAN_STOP_REASON_REQUIRED",
					"A reason is required to stop care plan [%s]".formatted(id));
		}
		return new CarePlan(
				id, elderId, createdByUserId, supersedesPlanId, version, Status.STOPPED,
				totalHours, publishedAt, createdAt, updatedAt,
				effectiveDate, reason, stoppedByUserId, LocalDateTime.now());
	}
}

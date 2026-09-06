package sg.nus.carelink.incident.domain.model;

import java.time.LocalDateTime;

/**
 * Domain model for spot_check.
 *
 * <p>Generated starting point: the same fields as the table, and nothing else. This is
 * where the business rules and the design patterns go — reshape it into a proper
 * aggregate (add behaviour, fold child tables in, drop columns the domain does not
 * care about). identity.domain.model.AppUser is the template. Must not import JPA or
 * Spring Data; ArchUnit rejects the build if it does.
 */
public record SpotCheck(
		Long id,
		Long elderId,
		Long caregiverId,
		Long visitId,
		Long raisedByUserId,
		Long approvingFamilyMemberId,
		LocalDateTime proposedTime,
		String reason,
		SpotCheck.ApprovalStatus approvalStatus,
		LocalDateTime decidedAt,
		String finding,
		String caregiverResponse,
		LocalDateTime checkedAt,
		LocalDateTime createdAt) {

	public enum ApprovalStatus {
		PENDING_APPROVAL, APPROVED, REJECTED
	}
}

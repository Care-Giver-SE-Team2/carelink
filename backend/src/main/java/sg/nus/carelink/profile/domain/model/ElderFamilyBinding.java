package sg.nus.carelink.profile.domain.model;

import java.time.LocalDateTime;

/**
 * Domain model for elder_family_binding.
 *
 * <p>Generated starting point: the same fields as the table, and nothing else. This is
 * where the business rules and the design patterns go — reshape it into a proper
 * aggregate (add behaviour, fold child tables in, drop columns the domain does not
 * care about). identity.domain.model.AppUser is the template. Must not import JPA or
 * Spring Data; ArchUnit rejects the build if it does.
 */
public record ElderFamilyBinding(
		Long id,
		Long elderId,
		Long familyMemberId,
		ElderFamilyBinding.Relationship relationship,
		boolean isPrimaryContact,
		ElderFamilyBinding.AccessScope accessScope,
		ElderFamilyBinding.Status status,
		LocalDateTime confirmedAt,
		LocalDateTime expiresAt,
		LocalDateTime createdAt,
		LocalDateTime updatedAt) {

	public enum Relationship {
		SON, DAUGHTER, SPOUSE, GUARDIAN, OTHER
	}

	public enum AccessScope {
		FULL, READ_ONLY
	}

	public enum Status {
		PENDING_CONFIRMATION, ACTIVE, REJECTED, REVOKED
	}
}

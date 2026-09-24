package sg.nus.carelink.profile.domain.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Domain model for credential.
 *
 * <p>Generated starting point: the same fields as the table, and nothing else. This is
 * where the business rules and the design patterns go — reshape it into a proper
 * aggregate (add behaviour, fold child tables in, drop columns the domain does not
 * care about). identity.domain.model.AppUser is the template. Must not import JPA or
 * Spring Data; ArchUnit rejects the build if it does.
 */
public record Credential(
		Long id,
		Long caregiverId,
		Long credentialTypeId,
		Long reviewedByUserId,
		String certificateNo,
		String issuingBody,
		LocalDate validFrom,
		LocalDate expiryDate,
		Credential.Status status,
		LocalDateTime createdAt,
		LocalDateTime updatedAt,
		Long renewsCredentialId) {

	/**
	 * Projects a public credential status without changing the stored review state.
	 * Expiry dates include the named day; future validFrom remains a separate display constraint.
	 *
	 * @param today Current date in Asia/Singapore
	 * @return Public status, or empty for submitted or rejected credentials
	 * @author Wang Zhili
	 */
	public Optional<Status> publicStatusOn(LocalDate today) {
		return switch (status) {
			case SUBMITTED, REJECTED -> Optional.empty();
			case REVOKED, EXPIRED -> Optional.of(status);
			case PUBLISHED, EXPIRING -> Optional.of(expiryDate.isBefore(today) ? Status.EXPIRED : status);
		};
	}

	public enum Status {
		SUBMITTED, PUBLISHED, REJECTED, EXPIRING, EXPIRED, REVOKED
	}
}

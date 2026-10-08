package sg.nus.carelink.incident.domain.model;

import java.time.LocalDateTime;
import sg.nus.carelink.shared.error.BusinessRuleViolation;

/** Own notification contact; possession must be proved again after every address change.
 * @author Wang Zhili
 */
public record FamilyNotificationEmail(Long familyMemberId, String email, LocalDateTime verifiedAt,
		String tokenHash, LocalDateTime verificationExpiresAt, LocalDateTime requestedAt) {
	public static FamilyNotificationEmail empty(Long familyId) {
		return new FamilyNotificationEmail(familyId, null, null, null, null, null);
	}
	public FamilyNotificationEmail request(String address, String hash, LocalDateTime now) {
		if (requestedAt != null && now.isBefore(requestedAt.plusMinutes(1))) {
			throw new BusinessRuleViolation("EMAIL_VERIFICATION_COOLDOWN", "Wait one minute before requesting another code.");
		}
		return new FamilyNotificationEmail(familyMemberId, address, null, hash, now.plusMinutes(15), now);
	}
	public FamilyNotificationEmail verify(String hash, LocalDateTime now) {
		if (tokenHash == null || !tokenHash.equals(hash) || !now.isBefore(verificationExpiresAt)) {
			throw new BusinessRuleViolation("EMAIL_VERIFICATION_INVALID", "The verification code is invalid or expired. Request a new code.");
		}
		return new FamilyNotificationEmail(familyMemberId, email, now, null, null, requestedAt);
	}
	public FamilyNotificationEmail remove() {
		// Keep the last request time: deleting an address must not bypass the send cooldown.
		return new FamilyNotificationEmail(familyMemberId, null, null, null, null, requestedAt);
	}
}

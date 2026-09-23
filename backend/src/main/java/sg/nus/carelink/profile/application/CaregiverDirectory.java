package sg.nus.carelink.profile.application;

import java.util.Optional;

/**
 * Provides public caregiver data to authorized application use cases.
 *
 * @author Wang Zhili
 */
public interface CaregiverDirectory {

	/**
	 * Finds public details after the caller has checked resource access.
	 *
	 * @param caregiverId Caregiver profile identifier
	 * @return Public profile, or empty when the caregiver does not exist
	 * @author Wang Zhili
	 */
	Optional<CaregiverPublicProfile> findPublicProfile(Long caregiverId);
}

package sg.nus.carelink.profile.application;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.profile.domain.repository.CaregiverRepository;

/**
 * Projects stored caregiver records into public profile fields.
 *
 * @author Wang Zhili
 */
@Service
@Transactional(readOnly = true)
public class CaregiverDirectoryService implements CaregiverDirectory {

	private final CaregiverRepository caregivers;

	public CaregiverDirectoryService(CaregiverRepository caregivers) {
		this.caregivers = caregivers;
	}

	@Override
	public Optional<CaregiverPublicProfile> findPublicProfile(Long caregiverId) {
		return caregivers.findById(caregiverId)
				.map(caregiver -> new CaregiverPublicProfile(caregiver.id(), caregiver.fullName(),
						dialectNames(caregiver.dialects())));
	}

	private static List<String> dialectNames(String storedDialects) {
		if (storedDialects == null) {
			return List.of();
		}
		return Arrays.stream(storedDialects.split(","))
				.map(String::strip).filter(dialect -> !dialect.isEmpty()).toList();
	}
}

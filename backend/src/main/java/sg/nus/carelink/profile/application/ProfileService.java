package sg.nus.carelink.profile.application;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.profile.domain.model.Elder;
import sg.nus.carelink.profile.domain.repository.ElderRepository;

/**
 * Application layer of the profile module (elders, caregivers, family members, their bindings, intake applications and credentials).
 *
 * <p>One public method per use case (UC-MG01, UC-MG02, UC-FM01, UC-EL04): it loads what it needs through
 * the domain ports, calls the domain model, saves, and returns. Business rules stay in
 * domain.model. identity.application.IdentityService is the template.
 */
@Service
@Transactional
public class ProfileService {

	private final ElderRepository elders;

	public ProfileService(ElderRepository elders) {
		this.elders = elders;
	}

	@Transactional(readOnly = true)
	public Optional<Elder> findElder(Long id) {
		return elders.findById(id);
	}
}

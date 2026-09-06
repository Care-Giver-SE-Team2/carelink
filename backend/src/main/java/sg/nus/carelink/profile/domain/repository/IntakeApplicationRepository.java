package sg.nus.carelink.profile.domain.repository;

import java.util.Optional;

import sg.nus.carelink.profile.domain.model.IntakeApplication;

/**
 * Port for intake_application: what the application layer may ask of storage, in domain terms.
 * Implemented by infrastructure.persistence.adapter.IntakeApplicationRepositoryAdapter. Add finders as
 * the use cases need them; identity.domain.repository.AppUserRepository is the template.
 */
public interface IntakeApplicationRepository {

	Optional<IntakeApplication> findById(Long id);

	IntakeApplication save(IntakeApplication intakeApplication);
}

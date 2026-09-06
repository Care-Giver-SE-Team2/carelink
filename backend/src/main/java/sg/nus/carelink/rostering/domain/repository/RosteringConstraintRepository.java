package sg.nus.carelink.rostering.domain.repository;

import java.util.Optional;

import sg.nus.carelink.rostering.domain.model.RosteringConstraint;

/**
 * Port for rostering_constraint: what the application layer may ask of storage, in domain terms.
 * Implemented by infrastructure.persistence.adapter.RosteringConstraintRepositoryAdapter. Add finders as
 * the use cases need them; identity.domain.repository.AppUserRepository is the template.
 */
public interface RosteringConstraintRepository {

	Optional<RosteringConstraint> findById(Long id);

	RosteringConstraint save(RosteringConstraint rosteringConstraint);
}

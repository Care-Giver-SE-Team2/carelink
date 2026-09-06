package sg.nus.carelink.visit.domain.repository;

import java.util.Optional;

import sg.nus.carelink.visit.domain.model.VisitStateTransition;

/**
 * Port for visit_state_transition: what the application layer may ask of storage, in domain terms.
 * Implemented by infrastructure.persistence.adapter.VisitStateTransitionRepositoryAdapter. Add finders as
 * the use cases need them; identity.domain.repository.AppUserRepository is the template.
 */
public interface VisitStateTransitionRepository {

	Optional<VisitStateTransition> findById(Long id);

	VisitStateTransition save(VisitStateTransition visitStateTransition);
}

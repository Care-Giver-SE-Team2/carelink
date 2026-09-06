package sg.nus.carelink.visit.application;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.visit.domain.model.Visit;
import sg.nus.carelink.visit.domain.repository.VisitRepository;

/**
 * Application layer of the visit module (the visit lifecycle: assignment, state transitions, tasks, vitals, evidence, elder confirmation).
 *
 * <p>One public method per use case (UC-CG03, UC-CG05, UC-EL01): it loads what it needs through
 * the domain ports, calls the domain model, saves, and returns. Business rules stay in
 * domain.model. identity.application.IdentityService is the template.
 */
@Service
@Transactional
public class VisitService {

	private final VisitRepository visits;

	public VisitService(VisitRepository visits) {
		this.visits = visits;
	}

	@Transactional(readOnly = true)
	public Optional<Visit> findVisit(Long id) {
		return visits.findById(id);
	}
}

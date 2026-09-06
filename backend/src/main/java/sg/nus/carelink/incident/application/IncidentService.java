package sg.nus.carelink.incident.application;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.repository.IncidentRepository;

/**
 * Application layer of the incident module (incidents, their escalation log, family acknowledgement and spot checks).
 *
 * <p>One public method per use case (UC-MG05, UC-CG04, UC-EL03, UC-FM05): it loads what it needs through
 * the domain ports, calls the domain model, saves, and returns. Business rules stay in
 * domain.model. identity.application.IdentityService is the template.
 */
@Service
@Transactional
public class IncidentService {

	private final IncidentRepository incidents;

	public IncidentService(IncidentRepository incidents) {
		this.incidents = incidents;
	}

	@Transactional(readOnly = true)
	public Optional<Incident> findIncident(Long id) {
		return incidents.findById(id);
	}
}

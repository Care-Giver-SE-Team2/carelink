package sg.nus.carelink.incident.application;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.model.IncidentLog;
import sg.nus.carelink.incident.domain.repository.IncidentLogRepository;
import sg.nus.carelink.incident.domain.repository.IncidentRepository;

/**
 * UC-SYS02: the scan that makes a response countdown mean something.
 *
 * <p>Without it the deadline on an incident would be decoration. It looks for incidents
 * that are still waiting to be taken over and whose countdown has run out, and escalates
 * each one to the next level of its chain.
 *
 * <p>Two things it is careful about, both from the use case:
 * <ul>
 *   <li><b>2a, the near-escalation.</b> The responder may take the incident over in the
 *       moment between the scan selecting it and the scan reaching it. The incident is read
 *       again inside the per-incident transaction, and if it is no longer waiting the
 *       escalation is cancelled — and the fact that it nearly happened is written down.</li>
 *   <li><b>One transaction per incident.</b> A batch-wide transaction would mean one
 *       failing incident rolled back every other escalation in the same sweep. A stuck
 *       incident must not be able to hold up the rest.</li>
 * </ul>
 */
@Service
public class EscalationScanService {

	private static final Logger log = LoggerFactory.getLogger(EscalationScanService.class);

	private final IncidentRepository incidents;
	private final IncidentLogRepository timeline;
	private final EscalationService escalation;
	private final Clock clock;

	EscalationScanService(
			IncidentRepository incidents,
			IncidentLogRepository timeline,
			EscalationService escalation,
			Clock clock) {

		this.incidents = incidents;
		this.timeline = timeline;
		this.escalation = escalation;
		this.clock = clock;
	}

	/**
	 * One sweep.
	 *
	 * @return how many incidents actually moved on; the rest were taken over in the meantime
	 */
	public int sweep() {
		LocalDateTime now = LocalDateTime.now(clock);
		List<Incident> overdue = incidents.findAwaitingTakeOverPastDeadline(now);

		if (overdue.isEmpty()) {
			return 0;
		}

		int escalated = 0;
		for (Incident candidate : overdue) {
			try {
				if (escalateIfStillOverdue(candidate.id(), now)) {
					escalated++;
				}
			}
			catch (RuntimeException failure) {
				// One incident that cannot be escalated must not stop the sweep. It stays
				// overdue and the next sweep tries again; the failure is visible in the log
				// with the request id and the incident it belongs to.
				log.error("Escalation failed for incident {}", candidate.id(), failure);
			}
		}

		log.info("Escalation sweep at {}: {} overdue, {} escalated", now, overdue.size(), escalated);
		return escalated;
	}

	/**
	 * Re-reads the incident and escalates it only if it is still overdue.
	 *
	 * <p>{@code REQUIRES_NEW} is what gives each incident its own transaction, so a rollback
	 * is scoped to the one that failed.
	 */
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public boolean escalateIfStillOverdue(Long incidentId, LocalDateTime scanStartedAt) {
		Incident current = incidents.findById(incidentId).orElse(null);
		if (current == null) {
			return false;
		}

		if (!current.isOverdue(LocalDateTime.now(clock))) {
			timeline.save(IncidentLog.systemEntry(incidentId, IncidentLog.Action.ESCALATION_CANCELLED,
					"countdown had expired when the sweep started at %s, but the incident is now %s"
							.formatted(scanStartedAt, current.status()),
					LocalDateTime.now(clock)));
			return false;
		}

		escalation.escalate(current, "response countdown expired", IncidentLog.SYSTEM_ACTOR);
		return true;
	}
}

package sg.nus.carelink.incident.application;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.incident.domain.model.ContactAttempt;
import sg.nus.carelink.incident.domain.model.EscalationChain;
import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.model.IncidentLog;
import sg.nus.carelink.incident.domain.model.Playbook;
import sg.nus.carelink.incident.domain.repository.IncidentLogRepository;
import sg.nus.carelink.incident.domain.repository.IncidentRepository;
import sg.nus.carelink.shared.error.BusinessRuleViolation;
import sg.nus.carelink.shared.error.ResourceNotFound;

/**
 * Application layer of the incident module: one public method per step of UC-MG05, plus the
 * two entry points that raise an incident in the first place (UC-EL03, UC-CG04).
 *
 * <p>Each method does the same four things and nothing else: load through the ports, call
 * the domain model, save, write the timeline. The rules themselves are in
 * {@code domain.model}; the routing decisions are in {@code domain.service} behind
 * {@link EscalationService}. If a rule appears in this file, it is in the wrong place.
 *
 * <p>Nothing here catches a {@link BusinessRuleViolation}: an illegal transition is meant
 * to reach the client as HTTP 409, and swallowing it would let a rejected take-over look
 * like a successful one.
 */
@Service
@Transactional
public class IncidentService {

	private final IncidentRepository incidents;
	private final IncidentLogRepository timeline;
	private final EscalationService escalation;
	private final Clock clock;

	IncidentService(
			IncidentRepository incidents,
			IncidentLogRepository timeline,
			EscalationService escalation,
			Clock clock) {

		this.incidents = incidents;
		this.timeline = timeline;
		this.escalation = escalation;
		this.clock = clock;
	}

	// ------------------------------------------------------------------- raising ---

	/**
	 * UC-EL03: an elder triggers the one-tap emergency call.
	 *
	 * <p>The incident is saved, then routed. Routing is not optional: an SOS with no
	 * responder and no countdown would sit in the table waiting for a human to notice it,
	 * which is the exact failure the escalation chain exists to prevent.
	 */
	public Incident createElderEmergency(
			Long elderId,
			Long reportedByUserId,
			BigDecimal latitude,
			BigDecimal longitude,
			String locationText,
			String description) {

		Incident saved = incidents.save(Incident.createElderSos(
				elderId, reportedByUserId, latitude, longitude, locationText, description));

		timeline.save(IncidentLog.entry(saved.id(), actorLabel(reportedByUserId, "elder"),
				IncidentLog.Action.REPORTED, "one-tap emergency call", now()));

		return escalation.routeNewIncident(saved);
	}

	/** UC-CG04: a caregiver reports a care exception during or after a visit. */
	public Incident reportByCaregiver(
			Long elderId,
			Long visitId,
			Long reportedByUserId,
			Incident.Category category,
			Incident.Severity severity,
			String description) {

		Incident saved = incidents.save(Incident.reportedByCaregiver(
				elderId, visitId, reportedByUserId, category, severity, description, now()));

		timeline.save(IncidentLog.entry(saved.id(), actorLabel(reportedByUserId, "caregiver"),
				IncidentLog.Action.REPORTED, "reported by caregiver", now()));

		return escalation.routeNewIncident(saved);
	}

	// ------------------------------------------------------------------ handling ---

	/**
	 * UC-MG05 step 3: a manager takes the incident over. The countdown stops, which is what
	 * takes it out of the scheduled scan's reach.
	 *
	 * <p>A take-over that is refused because somebody else got there first is written to the
	 * timeline before the rejection is thrown, so the attempt leaves a trace.
	 */
	public Incident claim(Long incidentId, Long userId, String actor) {
		Incident incident = require(incidentId);
		try {
			Incident claimed = incidents.save(incident.claimBy(userId));
			timeline.save(IncidentLog.entry(incidentId, actor, IncidentLog.Action.CLAIMED,
					"taken over; countdown stopped", now()));
			return claimed;
		}
		catch (BusinessRuleViolation rejected) {
			timeline.save(IncidentLog.entry(incidentId, actor, IncidentLog.Action.CLAIM_REJECTED,
					rejected.getMessage(), now()));
			throw rejected;
		}
	}

	/** UC-MG05 exception 3a and UC-SYS02: hand the incident to the next level. */
	public Incident escalate(Long incidentId, String reason, String actor) {
		Incident incident = require(incidentId);
		if (!incident.awaitingTakeOver()) {
			throw new BusinessRuleViolation(
					"INCIDENT_NOT_AWAITING_TAKE_OVER",
					"Only an incident still waiting to be taken over can be escalated; it is "
							+ incident.status());
		}
		return escalation.escalate(incident, reason == null || reason.isBlank() ? "escalated by hand" : reason, actor);
	}

	/**
	 * UC-MG05 step 4: record an attempt to reach the family, reached or not.
	 *
	 * <p>When the family could not be reached the caller is told which playbook applies, so
	 * the manager can act without waiting — "家属联络不上：启用标准处置预案先行处置".
	 */
	public ContactOutcome recordContactAttempt(Long incidentId, ContactAttempt attempt, String actor) {
		Incident incident = require(incidentId);
		timeline.save(IncidentLog.entry(incidentId, actor, IncidentLog.Action.CONTACT_ATTEMPTED,
				attempt.describe(), now()));

		Optional<Playbook> fallback = attempt.reachedTheFamily()
				? Optional.empty()
				: Playbook.forCategory(incident.category());

		return new ContactOutcome(incident, attempt, fallback.orElse(null));
	}

	/** UC-MG05 step 5: apply the standard response for this category. */
	public Incident applyPlaybook(Long incidentId, String playbookCode, String actor) {
		Incident incident = require(incidentId);
		Playbook playbook = Playbook.byCode(playbookCode)
				.orElseThrow(() -> new ResourceNotFound("Playbook", playbookCode));

		if (playbook.category() != incident.category()) {
			throw new BusinessRuleViolation(
					"PLAYBOOK_CATEGORY_MISMATCH",
					"Playbook %s is for %s incidents, this one is %s"
							.formatted(playbook.code(), playbook.category(), incident.category()));
		}

		timeline.save(IncidentLog.entry(incidentId, actor, IncidentLog.Action.PLAYBOOK_APPLIED,
				"%s - %s".formatted(playbook.code(), playbook.title()), now()));
		return incident;
	}

	/**
	 * UC-MG05 alternative 5a: the situation worsened. The severity changes, the chain is
	 * rebuilt for it, and the same timeline continues.
	 */
	public Incident changeSeverity(Long incidentId, Incident.Severity severity, String reason, String actor) {
		Incident incident = require(incidentId);
		Incident.Severity before = incident.severity();

		Incident changed = incidents.save(incident.changeSeverityTo(severity));
		timeline.save(IncidentLog.entry(incidentId, actor, IncidentLog.Action.SEVERITY_CHANGED,
				"%s -> %s: %s".formatted(before, severity, reason == null ? "no reason given" : reason), now()));

		return escalation.reassembleAfterSeverityChange(changed);
	}

	/**
	 * UC-MG05 step 6: record the conclusion and close the incident.
	 *
	 * <p>Only the responder who took it over may close it. Anyone else gets 403 rather than
	 * 409, because the request is well formed and the incident is in a closable state — the
	 * caller is simply not the person handling it.
	 */
	public Incident resolve(Long incidentId, Long userId, String resolutionNote, String outcome, String actor) {
		Incident incident = require(incidentId);

		if (!incident.isHandledBy(userId)) {
			throw new AccessDeniedException(
					"Only the responder handling this incident may resolve it");
		}
		if (resolutionNote == null || resolutionNote.isBlank()) {
			throw new BusinessRuleViolation(
					"RESOLUTION_NOTE_REQUIRED", "An incident cannot be closed without a resolution note");
		}

		Incident resolved = incidents.save(incident.resolveAt(now()));
		timeline.save(IncidentLog.entry(incidentId, actor, IncidentLog.Action.RESOLVED,
				"%s :: %s".formatted(outcome == null ? "HANDLED_ON_SITE" : outcome, resolutionNote), now()));
		return resolved;
	}

	// -------------------------------------------------------------------- reading ---

	@Transactional(readOnly = true)
	public Optional<Incident> findIncident(Long id) {
		return incidents.findById(id);
	}

	@Transactional(readOnly = true)
	public List<IncidentLog> timelineOf(Long incidentId) {
		require(incidentId);
		return timeline.findTimeline(incidentId);
	}

	@Transactional(readOnly = true)
	public EscalationChain escalationChainOf(Long incidentId) {
		return escalation.describeChain(require(incidentId));
	}

	@Transactional(readOnly = true)
	public List<Incident> forElder(Long elderId) {
		return incidents.findByElder(elderId);
	}

	@Transactional(readOnly = true)
	public List<Playbook> playbooks() {
		return List.of(Playbook.values());
	}

	// -------------------------------------------------------------------- helpers ---

	private Incident require(Long id) {
		return incidents.findById(id).orElseThrow(() -> new ResourceNotFound("Incident", id));
	}

	private LocalDateTime now() {
		return LocalDateTime.now(clock);
	}

	private static String actorLabel(Long userId, String role) {
		return userId == null ? role : "%s:%d".formatted(role, userId);
	}

	/**
	 * What came back from recording a contact attempt: the incident, what was tried, and the
	 * playbook to fall back on when the family could not be reached.
	 */
	public record ContactOutcome(Incident incident, ContactAttempt attempt, Playbook suggestedPlaybook) {

		public boolean hasFallback() {
			return suggestedPlaybook != null;
		}
	}
}

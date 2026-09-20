package sg.nus.carelink.incident.domain.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import sg.nus.carelink.incident.domain.model.Responder;

/**
 * Who is available to take an incident, and when.
 *
 * <p>Declared here rather than in the identity module because the escalation rules are what
 * need it, and the domain layer is allowed to say what it needs without knowing where the
 * answer comes from. The implementation lives in {@code infrastructure}; a unit test
 * supplies a two-line fake and the whole chain becomes testable without a database.
 *
 * <p><strong>Known simplification.</strong> CareLink has no duty-roster table for managers
 * yet: {@code user_role} records who <em>is</em> a manager, not who is <em>on shift</em>.
 * The current implementation approximates "on duty" from the hour of the day. When a real
 * roster table arrives this interface does not change, which is the point of it being an
 * interface.
 */
public interface DutyRoster {

	/** The manager on shift at this moment, if the institution has one. */
	Optional<Responder> dutyManagerAt(LocalDateTime when);

	/** Every enabled manager, on shift or not. The out-of-hours fallback. */
	List<Responder> allManagers();

	/** Display name for a user already named on an incident, so the timeline reads properly. */
	Optional<Responder> responderById(Long userId);
}

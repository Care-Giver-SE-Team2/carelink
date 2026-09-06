package sg.nus.carelink.rostering.domain.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Domain model for rostering_run.
 *
 * <p>Generated starting point: the same fields as the table, and nothing else. This is
 * where the business rules and the design patterns go — reshape it into a proper
 * aggregate (add behaviour, fold child tables in, drop columns the domain does not
 * care about). identity.domain.model.AppUser is the template. Must not import JPA or
 * Spring Data; ArchUnit rejects the build if it does.
 */
public record RosteringRun(
		Long id,
		RosteringRun.TriggerType triggerType,
		Long absenceId,
		RosteringRun.Objective objective,
		Long requestedByUserId,
		RosteringRun.Status status,
		Integer visitsTotal,
		Integer visitsCovered,
		Integer continuityKept,
		BigDecimal addedTravelKm,
		LocalDateTime ranAt,
		LocalDateTime committedAt) {

	public enum TriggerType {
		NEW_VISIT, ABSENCE, MANUAL
	}

	public enum Objective {
		CONTINUITY, TRAVEL_TIME, EVEN_WORKLOAD, COST
	}

	public enum Status {
		PROPOSED, COMMITTED, DISCARDED
	}
}

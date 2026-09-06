package sg.nus.carelink.rostering.domain.model;

import java.math.BigDecimal;

/**
 * Domain model for rostering_candidate.
 *
 * <p>Generated starting point: the same fields as the table, and nothing else. This is
 * where the business rules and the design patterns go — reshape it into a proper
 * aggregate (add behaviour, fold child tables in, drop columns the domain does not
 * care about). identity.domain.model.AppUser is the template. Must not import JPA or
 * Spring Data; ArchUnit rejects the build if it does.
 */
public record RosteringCandidate(
		Long id,
		Long rosteringRunId,
		Long visitId,
		Long caregiverId,
		Integer optionRank,
		BigDecimal score,
		RosteringCandidate.Outcome outcome,
		String excludedByCode) {

	public enum Outcome {
		SELECTED, SUGGESTED, EXCLUDED
	}
}

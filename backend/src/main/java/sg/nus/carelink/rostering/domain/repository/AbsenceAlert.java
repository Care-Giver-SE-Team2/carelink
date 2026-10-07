package sg.nus.carelink.rostering.domain.repository;

import sg.nus.carelink.rostering.domain.model.AbsenceReport;

/**
 * Telling the managers about an absence they have to act on (UC-MG04 step 1: "the manager
 * receives the caregiver's absence notice"). A manager who records an absence already knows
 * about it, so only a caregiver's own request is announced.
 */
public interface AbsenceAlert {

	/** A caregiver has asked for leave; every manager hears it, since any of them may review it. */
	void requested(AbsenceReport absence, String caregiverName);
}

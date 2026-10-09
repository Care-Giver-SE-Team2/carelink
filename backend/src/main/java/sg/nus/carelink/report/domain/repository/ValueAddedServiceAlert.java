package sg.nus.carelink.report.domain.repository;

import java.time.LocalDateTime;

/**
 * Telling the managers about an extra service a family approved (UC-FM08). Approval dispatches a
 * visit with nobody on it, so somebody has to assign a caregiver before it starts; any manager
 * may, so every manager hears it.
 */
public interface ValueAddedServiceAlert {

	/** The family approved the request; its visit now waits for a caregiver. */
	void dispatched(Dispatched what);

	/** The dispatched visit: whose, which service, and when. */
	record Dispatched(Long requestId, Long visitId, Long elderId, String serviceName, LocalDateTime start,
			LocalDateTime end) {
	}
}

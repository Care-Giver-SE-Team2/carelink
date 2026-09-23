package sg.nus.carelink.visit.application;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.profile.application.FamilyAccessQuery;
import sg.nus.carelink.visit.domain.model.VisitPage;
import sg.nus.carelink.visit.domain.model.VisitScheduleFilter;
import sg.nus.carelink.visit.domain.repository.VisitScheduleQuery;

/**
 * Queries family schedules after validating current elder and caregiver access.
 *
 * @author Wang Zhili
 */
@Service
@Transactional(readOnly = true)
public class FamilyVisitQueryService {

	private final FamilyAccessQuery access;
	private final VisitScheduleQuery visits;
	private final Clock clock;

	public FamilyVisitQueryService(FamilyAccessQuery access, VisitScheduleQuery visits, Clock clock) {
		this.access = access;
		this.visits = visits;
		this.clock = clock;
	}

	/**
	 * Lists visits for the authenticated family's currently readable elders.
	 *
	 * @param authenticatedUsername Username supplied by the authenticated session
	 * @param filter Elder, caregiver, date, status and page selections
	 * @return Filtered visit page and its server snapshot time
	 * @author Wang Zhili
	 */
	public FamilyVisitSchedule listMine(String authenticatedUsername, VisitScheduleFilter filter) {
		OffsetDateTime asOf = OffsetDateTime.now(clock.withZone(ZoneId.of("Asia/Singapore")));
		Set<Long> readableElders = access.readableElderIds(authenticatedUsername);
		if (filter.elderId() != null && !readableElders.contains(filter.elderId())) {
			throw new AccessDeniedException("A readable elder binding is required");
		}
		if (filter.caregiverId() != null && !visits.hasAssignedVisit(readableElders, filter.caregiverId())) {
			throw new AccessDeniedException("A caregiver relationship with a readable elder is required");
		}
		if (readableElders.isEmpty()) {
			return new FamilyVisitSchedule(new VisitPage(List.of(), filter.page(), filter.size(), 0), asOf);
		}
		Set<Long> selectedElders = filter.elderId() == null ? readableElders : Set.of(filter.elderId());
		return new FamilyVisitSchedule(
				visits.findForElders(selectedElders, filter, filter.dateRange(asOf.toLocalDate())), asOf);
	}
}

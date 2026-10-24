package sg.nus.carelink.profile.application;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.profile.domain.model.ServiceApplication;
import sg.nus.carelink.profile.domain.repository.ServiceApplicationRepository;
import sg.nus.carelink.profile.domain.service.ServiceApplicationProgress.Outcome;
import sg.nus.carelink.profile.domain.service.ServiceApplicationProgress.PlanVersion;

/**
 * Records which of an elder's service applications the care plan now fully answers, so the
 * manager's elder list stops re-reading plans for them. Run after a plan version is published and
 * after an application is submitted (one may be planned the moment it arrives). The outcome is
 * still worked out from the plan versions wherever it is shown; this only remembers it.
 */
@Service
public class ServiceApplicationPlannedRecorder {

	private final ServiceApplicationRepository applications;
	private final CareRequestProgress progress;
	private final Clock clock;

	ServiceApplicationPlannedRecorder(ServiceApplicationRepository applications, CareRequestProgress progress,
			Clock clock) {
		this.applications = applications;
		this.progress = progress;
		this.clock = clock;
	}

	/** Its own transaction, run after the change behind it commits, so the new version is visible. */
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void recordFor(Long elderId) {
		List<ServiceApplication> unanswered = applications.findUnansweredByElderIds(Set.of(elderId));
		if (unanswered.isEmpty()) {
			return;
		}
		List<PlanVersion> versions = progress.versions(elderId);
		Set<Long> planned = unanswered.stream()
				.filter(application -> progress.of(application, versions).outcome() == Outcome.PLANNED)
				.map(ServiceApplication::id)
				.collect(Collectors.toSet());
		applications.recordPlanned(planned, LocalDateTime.now(clock.withZone(ZoneOffset.UTC)));
	}
}

package sg.nus.carelink.profile.application;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.careplan.application.CarePlanLookup;
import sg.nus.carelink.careplan.domain.model.CarePlan;
import sg.nus.carelink.profile.domain.model.Elder;
import sg.nus.carelink.profile.domain.repository.ElderRepository;

/**
 * Application layer of the profile module (elders, caregivers, family members, their bindings, intake applications and credentials).
 *
 * <p>One public method per use case (UC-MG01, UC-MG02, UC-FM01, UC-EL04): it loads what it needs through
 * the domain ports, calls the domain model, saves, and returns. Business rules stay in
 * domain.model. identity.application.IdentityService is the template.
 */
@Service
@Transactional
public class ProfileService {

	private final ElderRepository elders;
	private final CarePlanLookup carePlans;

	public ProfileService(ElderRepository elders, CarePlanLookup carePlans) {
		this.elders = elders;
		this.carePlans = carePlans;
	}

	@Transactional(readOnly = true)
	public Optional<Elder> findElder(Long id) {
		return elders.findById(id);
	}

	/** UC-MG01 step one: every elder the manager can search, each with its latest plan status. */
	@Transactional(readOnly = true)
	public List<ElderSummary> listElders() {
		return elders.findAll().stream()
				.map(elder -> toSummary(elder, carePlans.findLatestByElderId(elder.id()).orElse(null)))
				.toList();
	}

	private static ElderSummary toSummary(Elder elder, CarePlan latestPlan) {
		boolean noActivePlan = latestPlan == null
				|| latestPlan.status() == CarePlan.Status.SUPERSEDED
				|| latestPlan.status() == CarePlan.Status.STOPPED;
		if (noActivePlan) {
			return new ElderSummary(elder, "none", null);
		}
		String status = latestPlan.status() == CarePlan.Status.PUBLISHED ? "published" : "draft";
		return new ElderSummary(elder, status, latestPlan.version());
	}
}

package sg.nus.carelink.profile.application;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.careplan.application.CarePlanLookup;
import sg.nus.carelink.careplan.domain.model.CarePlan;
import sg.nus.carelink.profile.domain.model.Elder;
import sg.nus.carelink.profile.domain.repository.ElderRepository;
import sg.nus.carelink.shared.error.ResourceNotFound;

/**
 * Application layer of the profile module
 * (elders, caregivers, family members, their bindings,
 * intake applications and credentials).
 *
 * <p>One public method per use case (UC-MG01, UC-MG02, UC-FM01, UC-EL04):
 * it loads what it needs through the domain ports, calls the domain model,
 * saves, and returns. Business rules stay in domain.model.
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

	/**
	 * UC-MG01 step one: every elder the manager can search, each with its latest plan status and
	 * next visit date.
	 */
	@Transactional(readOnly = true)
	public List<ElderSummary> listElders() {
		return summarize(elders.findAll(), LocalDate.now(ZoneId.systemDefault()));
	}

	/**
	 * Lists selected elders with plan status and the next planned visit date.
	 *
	 * @param elderIds Elder IDs authorized by the calling use case
	 * @param fromDate First date considered for the next planned visit
	 * @return Elder summaries in ascending ID order, or an empty list
	 * @author Wang Zhili
	 */
	@Transactional(readOnly = true)
	public List<ElderSummary> listEldersByIds(Set<Long> elderIds, LocalDate fromDate) {
		if (elderIds.isEmpty()) {
			return List.of();
		}
		return summarize(elders.findByIds(elderIds), fromDate);
	}

	private List<ElderSummary> summarize(List<Elder> selectedElders, LocalDate fromDate) {
		return selectedElders.stream()
				.map(elder -> toSummary(
						elder,
						carePlans.findLatestByElderId(elder.id()).orElse(null),
						carePlans.findNextVisitDate(elder.id(), fromDate).orElse(null)))
				.toList();
	}

	private static ElderSummary toSummary(Elder elder, CarePlan latestPlan, LocalDate nextVisitDate) {
		if (latestPlan == null || latestPlan.status() == CarePlan.Status.SUPERSEDED) {
			return new ElderSummary(elder, "none", null, null);
		}
		if (latestPlan.status() == CarePlan.Status.STOPPED) {
			return new ElderSummary(elder, "stopped", latestPlan.version(), null);
		}
		String status = latestPlan.status() == CarePlan.Status.PUBLISHED ? "published" : "draft";
		return new ElderSummary(elder, status, latestPlan.version(), nextVisitDate);
	}

	    /**
     * Finds the elder profile linked to the authenticated app_user account.
     *
     * @param userId app_user.id
     * @return linked elder
     * @throws ResourceNotFound when the account has no elder profile
     */
    @Transactional(readOnly = true)
    public Elder requireElderByUserId(Long userId) {
        return elders.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFound("Elder for user", userId));
    }
}

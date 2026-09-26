package sg.nus.carelink.profile.application;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.profile.domain.model.Caregiver;
import sg.nus.carelink.profile.domain.model.PrimaryCaregiverAssignment;
import sg.nus.carelink.profile.domain.repository.CaregiverRepository;
import sg.nus.carelink.profile.domain.repository.ElderRepository;
import sg.nus.carelink.profile.domain.repository.PrimaryCaregiverAssignmentRepository;
import sg.nus.carelink.shared.error.BusinessRuleViolation;
import sg.nus.carelink.shared.error.ResourceNotFound;

/**
 * UC-MG02: the manager names, changes or removes an elder's primary caregiver from the Elders
 * index. Whether a caregiver may be named is Caregiver.isAssignable(); this class only loads,
 * checks existence and saves.
 */
@Service
@Transactional
public class PrimaryCaregiverService {

	private final ElderRepository elders;
	private final CaregiverRepository caregivers;
	private final PrimaryCaregiverAssignmentRepository assignments;
	private final Clock clock;

	public PrimaryCaregiverService(ElderRepository elders, CaregiverRepository caregivers,
			PrimaryCaregiverAssignmentRepository assignments, Clock clock) {
		this.elders = elders;
		this.caregivers = caregivers;
		this.assignments = assignments;
		this.clock = clock;
	}

	/** Every caregiver the picker lists, ineligible ones included so the manager sees why. */
	@Transactional(readOnly = true)
	public List<Caregiver> listCaregivers() {
		return caregivers.findAll();
	}

	/**
	 * Names the caregiver as the elder's primary caregiver, replacing any existing one.
	 *
	 * @throws ResourceNotFound if the elder or caregiver does not exist
	 * @throws BusinessRuleViolation CAREGIVER_NOT_ASSIGNABLE if the caregiver is onboarding or inactive
	 */
	public PrimaryCaregiverSummary assign(Long elderId, Long caregiverId) {
		elders.findById(elderId).orElseThrow(() -> new ResourceNotFound("Elder", elderId));
		Caregiver caregiver = caregivers.findById(caregiverId)
				.orElseThrow(() -> new ResourceNotFound("Caregiver", caregiverId));
		if (!caregiver.isAssignable()) {
			throw new BusinessRuleViolation("CAREGIVER_NOT_ASSIGNABLE",
					caregiver.fullName() + " cannot be assigned while " + caregiver.status());
		}
		PrimaryCaregiverAssignment saved = assignments.save(
				new PrimaryCaregiverAssignment(elderId, caregiverId, LocalDateTime.now(clock)));
		return new PrimaryCaregiverSummary(caregiver.id(), caregiver.fullName(), saved.assignedAt());
	}

	/** Removes the elder's primary caregiver; a no-op if none is assigned. */
	public void unassign(Long elderId) {
		elders.findById(elderId).orElseThrow(() -> new ResourceNotFound("Elder", elderId));
		assignments.deleteByElderId(elderId);
	}
}

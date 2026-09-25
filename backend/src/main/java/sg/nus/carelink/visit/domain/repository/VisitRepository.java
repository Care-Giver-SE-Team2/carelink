package sg.nus.carelink.visit.domain.repository;

import java.util.List;
import java.util.Optional;

import sg.nus.carelink.visit.domain.model.Visit;

/**
 * Port for visit persistence.
 */
public interface VisitRepository {
	java.util.List<Visit> findAssigned(Long caregiverId, java.time.LocalDateTime from, java.time.LocalDateTime until);

    Optional<Visit> findById(Long id);

    /**
     * Visits that have been completed by the caregiver and are therefore
     * candidates for EL01 elder confirmation.
     */
    List<Visit> findCompletedByElderId(Long elderId);

    Visit save(Visit visit);
}
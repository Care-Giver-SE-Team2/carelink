package sg.nus.carelink.rostering.domain.repository;

import java.util.Optional;

import sg.nus.carelink.rostering.domain.model.AbsenceReport;

/**
 * Port for absence_report: what the application layer may ask of storage, in domain terms.
 * Implemented by infrastructure.persistence.adapter.AbsenceReportRepositoryAdapter. Add finders as
 * the use cases need them; identity.domain.repository.AppUserRepository is the template.
 */
public interface AbsenceReportRepository {

	Optional<AbsenceReport> findById(Long id);

	AbsenceReport save(AbsenceReport absenceReport);
}

package sg.nus.carelink.report.domain.repository;

import java.util.Optional;

import sg.nus.carelink.report.domain.model.Report;

/**
 * Port for report: what the application layer may ask of storage, in domain terms.
 * Implemented by infrastructure.persistence.adapter.ReportRepositoryAdapter. Add finders as
 * the use cases need them; identity.domain.repository.AppUserRepository is the template.
 */
public interface ReportRepository {

	Optional<Report> findById(Long id);

	Report save(Report report);
}

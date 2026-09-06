package sg.nus.carelink.report.application;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.report.domain.model.Report;
import sg.nus.carelink.report.domain.repository.ReportRepository;

/**
 * Application layer of the report module (periodic reports, value-added services and requests, caregiver reviews).
 *
 * <p>One public method per use case (UC-MG07, UC-FM04, UC-FM09): it loads what it needs through
 * the domain ports, calls the domain model, saves, and returns. Business rules stay in
 * domain.model. identity.application.IdentityService is the template.
 */
@Service
@Transactional
public class ReportService {

	private final ReportRepository reports;

	public ReportService(ReportRepository reports) {
		this.reports = reports;
	}

	@Transactional(readOnly = true)
	public Optional<Report> findReport(Long id) {
		return reports.findById(id);
	}
}

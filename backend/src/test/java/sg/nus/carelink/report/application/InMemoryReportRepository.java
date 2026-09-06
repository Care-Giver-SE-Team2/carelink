package sg.nus.carelink.report.application;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import sg.nus.carelink.report.domain.model.Report;
import sg.nus.carelink.report.domain.repository.ReportRepository;

/** Test double for the port: the service is exercised without Spring or a database (as in identity). */
class InMemoryReportRepository implements ReportRepository {

	private final Map<Long, Report> rows = new HashMap<>();
	private long nextId = 1;

	@Override
	public Optional<Report> findById(Long id) {
		return Optional.ofNullable(rows.get(id));
	}

	@Override
	public Report save(Report report) {
		Report stored = report.id() == null
				? new Report(nextId, report.elderId(), report.generatedByUserId(), report.audience(), report.periodStart(), report.periodEnd(), report.status(), report.content(), report.createdAt())
				: report;
		rows.put(stored.id(), stored);
		if (report.id() == null) {
			nextId++;
		}
		return stored;
	}
}

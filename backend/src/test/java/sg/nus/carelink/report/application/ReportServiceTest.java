package sg.nus.carelink.report.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.report.domain.model.Report;

class ReportServiceTest {

	private final InMemoryReportRepository repository = new InMemoryReportRepository();
	private final ReportService service = new ReportService(repository);

	@Test
	void findsWhatWasSaved() {
		Report saved = repository.save(new Report(
				null,
				2L,
				3L,
				Report.Audience.FAMILY,
				LocalDate.of(2026, 9, 6),
				LocalDate.of(2026, 9, 7),
				Report.Status.DRAFT,
				"v8",
				LocalDateTime.of(2026, 9, 6, 10, 9)));

		assertThat(service.findReport(saved.id())).contains(saved);
	}

	@Test
	void isEmptyForAnUnknownId() {
		assertThat(service.findReport(999L)).isEmpty();
	}
}

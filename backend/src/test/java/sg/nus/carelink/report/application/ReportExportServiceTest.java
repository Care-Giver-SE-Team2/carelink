package sg.nus.carelink.report.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.report.domain.model.Report;
import sg.nus.carelink.report.domain.model.ReportAmendment;
import sg.nus.carelink.report.support.ReportFixtures;
import sg.nus.carelink.shared.error.ResourceNotFound;

/**
 * UC-MG07's export: the report as filed, with every note appended to it, handed to the renderer;
 * a report that is not there is a 404 before anything is drawn, and a drawing that fails says so
 * without touching the report.
 */
class ReportExportServiceTest {

	/** 14:05:42 in Singapore. */
	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-23T06:05:42Z"), ZoneId.of("Asia/Singapore"));
	private static final byte[] PDF = {'%', 'P', 'D', 'F'};

	private final InMemoryReportRepository reports = new InMemoryReportRepository();
	private final CapturingRenderer renderer = new CapturingRenderer();
	private final ReportExportService service = new ReportExportService(reports, renderer, CLOCK);

	@Test
	void theReportAsFiledWithItsNotesIsDrawnAndStampedToTheMinute() {
		Report filed = file();
		reports.saveAmendment(filed
				.amend("Visit 13 was cancelled by the family.", 11L, LocalDateTime.of(2026, 9, 21, 9, 30))
				.amendments().getLast());

		byte[] pdf = service.exportPdf(filed.id());

		assertThat(pdf).isEqualTo(PDF);
		assertThat(renderer.report.id()).isEqualTo(filed.id());
		assertThat(renderer.report.content()).isEqualTo(filed.content());
		assertThat(renderer.report.amendments()).extracting(ReportAmendment::note)
				.containsExactly("Visit 13 was cancelled by the family.");
		assertThat(renderer.exportedAt).isEqualTo(LocalDateTime.of(2026, 10, 23, 14, 5));
	}

	@Test
	void anUnknownReportIsNotFoundAndNothingIsDrawn() {
		assertThatThrownBy(() -> service.exportPdf(99L)).isInstanceOf(ResourceNotFound.class);
		assertThat(renderer.report).isNull();
	}

	@Test
	void aDrawingThatFailsIsReportedAsUnavailableAndTheReportStaysAsItWas() {
		Report filed = file();
		Long id = filed.id();
		ReportExportService failing = new ReportExportService(reports, (report, at) -> {
			throw new IOException("disk full");
		}, CLOCK);

		assertThatThrownBy(() -> failing.exportPdf(id))
				.isInstanceOf(ReportExportUnavailable.class)
				.hasMessageContaining("Report " + id)
				.hasCauseInstanceOf(IOException.class);
		assertThat(reports.findById(filed.id())).contains(filed);
	}

	@Test
	void aRendererThatBreaksIsReportedTheSameWay() {
		Long id = file().id();
		ReportExportService broken = new ReportExportService(reports, (report, at) -> {
			throw new IllegalStateException("no page");
		}, CLOCK);

		assertThatThrownBy(() -> broken.exportPdf(id))
				.isInstanceOf(ReportExportUnavailable.class)
				.hasCauseInstanceOf(IllegalStateException.class);
	}

	private Report file() {
		return reports.save(Report.generate(ReportFixtures.ELDER, Report.Audience.INTERNAL, ReportFixtures.WEEK,
				ReportFixtures.content(), 11L, ReportFixtures.GENERATED_AT));
	}

	/** Keeps what it was asked to draw. */
	private static final class CapturingRenderer implements ReportPdfRenderer {

		private Report report;
		private LocalDateTime exportedAt;

		@Override
		public byte[] render(Report report, LocalDateTime exportedAt) {
			this.report = report;
			this.exportedAt = exportedAt;
			return PDF;
		}
	}
}

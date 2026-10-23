package sg.nus.carelink.report.application;

import java.io.IOException;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sg.nus.carelink.report.domain.model.Report;
import sg.nus.carelink.report.domain.repository.ReportRepository;
import sg.nus.carelink.shared.error.ResourceNotFound;

/**
 * UC-MG07's export: a filed report as a PDF.
 *
 * <p>Kept apart from {@link ReportService} because it only reads. It loads the report as filed,
 * with its notes, and hands it to the renderer; it generates nothing, files nothing and changes
 * nothing, so an export can be repeated as often as anyone likes and always shows what is on
 * file at that moment, notes appended since included.
 */
@Service
@Transactional(readOnly = true)
public class ReportExportService {

	private final ReportRepository reports;
	private final ReportPdfRenderer renderer;
	private final Clock clock;

	ReportExportService(ReportRepository reports, ReportPdfRenderer renderer, Clock clock) {
		this.reports = reports;
		this.renderer = renderer;
		this.clock = clock;
	}

	/**
	 * The report as a PDF.
	 *
	 * @throws ResourceNotFound         when there is no such report
	 * @throws ReportExportUnavailable when it could not be drawn; the report itself is unaffected
	 */
	public byte[] exportPdf(Long id) {
		Report report = reports.findById(id).orElseThrow(() -> new ResourceNotFound("Report", id));
		try {
			return renderer.render(report, LocalDateTime.now(clock).truncatedTo(ChronoUnit.MINUTES));
		} catch (IOException | RuntimeException e) {
			throw new ReportExportUnavailable(id, e);
		}
	}
}

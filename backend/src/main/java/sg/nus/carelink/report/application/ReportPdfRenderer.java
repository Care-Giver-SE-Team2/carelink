package sg.nus.carelink.report.application;

import java.io.IOException;
import java.time.LocalDateTime;

import sg.nus.carelink.report.domain.model.Report;

/**
 * Draws a filed report as a PDF: the copy a manager keeps, prints or passes on (UC-MG07, "可导出为
 * PDF").
 *
 * <p>A port, so the application layer does not know which library draws the pages; the adapter
 * lives in {@code infrastructure.pdf}. The document says what the report says and nothing more:
 * its sections as they were filed, its gaps, its disclaimer and every note appended to it. It
 * never reads the care records again and never rewrites the text, so exporting the same report
 * twice gives the same content.
 */
public interface ReportPdfRenderer {

	/**
	 * @param report     a filed report with its notes
	 * @param exportedAt when this copy is made, on the application clock; printed on it, so a
	 *                   paper copy says how old it is
	 * @return the PDF file
	 * @throws IOException when the document cannot be written
	 */
	byte[] render(Report report, LocalDateTime exportedAt) throws IOException;
}

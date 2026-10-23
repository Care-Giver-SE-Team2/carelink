package sg.nus.carelink.report.application;

/**
 * A report's PDF could not be drawn (UC-MG07 5b).
 *
 * <p>Nothing is lost when this happens: the filed report is untouched and still reads online,
 * and asking again draws the same filed content again. Answered with 503, as the contract's
 * {@code GET /reports/{id}/export} says.
 */
public class ReportExportUnavailable extends RuntimeException {

	private static final long serialVersionUID = 1L;

	public ReportExportUnavailable(Long reportId, Throwable cause) {
		super("Report %d could not be exported as PDF".formatted(reportId), cause);
	}
}

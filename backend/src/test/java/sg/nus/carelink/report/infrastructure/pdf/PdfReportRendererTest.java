package sg.nus.carelink.report.infrastructure.pdf;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.regex.Pattern;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

import sg.nus.carelink.report.domain.model.Report;
import sg.nus.carelink.report.domain.model.ReportAmendment;
import sg.nus.carelink.report.domain.model.ReportContent;
import sg.nus.carelink.report.domain.model.ReportFigure;
import sg.nus.carelink.report.domain.model.ReportSection;
import sg.nus.carelink.report.domain.model.ReportSeries;
import sg.nus.carelink.report.domain.service.ReportAssembler;
import sg.nus.carelink.report.support.ReportFixtures;

/**
 * The printed report: every section of the version it is drawn from, its gaps and its notes, on
 * pages that each say what they belong to.
 *
 * <p>Read back with PDFBox's own text extraction, so these check what a reader of the file gets,
 * not how it was drawn. Run with {@code -Dcarelink.report.pdf.samples=<folder>} to keep the
 * files, to look at them.
 */
class PdfReportRendererTest {

	private static final LocalDateTime EXPORTED = LocalDateTime.of(2026, 10, 23, 14, 5);
	private static final LocalDateTime NOTED = LocalDateTime.of(2026, 9, 22, 10, 0);

	private final PdfReportRenderer renderer = new PdfReportRenderer();

	@Test
	void theInternalVersionShowsEverySectionTheGapsAndTheNotes() throws IOException {
		Report report = filed(42L, Report.Audience.INTERNAL)
				.amend(ReportAmendment.Kind.FOLLOW_UP,
						"Talked to Daniel about changing gloves between tasks; next spot check booked for 30 Sep.", 11L,
						NOTED);

		byte[] pdf = renderer.render(report, EXPORTED);
		keep("internal-report.pdf", pdf);
		String text = text(pdf);

		assertThat(new String(pdf, 0, 5, StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
		assertThat(text).contains(
				"INTERNAL VERSION · RPT-42",
				"Internal report — Elder #1",
				"14 Sep – 20 Sep 2026 · Structured template",
				"Published · filed 20 Sep 2026 23:00",
				"Exported 23 Oct 2026 14:05",
				"Data incomplete",
				"Visit 13 on 2026-09-18 not closed",
				"01", "Overview", "Services", "Service completion", "Vital signs", "Observations", "Incidents",
				"Ratings and spot checks",
				"08", "Corrections and follow-ups",
				"FOLLOW-UP",
				"22 Sep 2026 10:00 · user #11",
				"End of report RPT-42",
				"Page 1 of",
				"VISITS CARRIED OUT",
				"66.67% as planned",
				"EVERY READING (8)",
				"1 point out of range",
				"verified",
				"needs improvement");
		assertThat(squash(text)).contains(
				squash(ReportFixtures.MEDICAL_NOTES),
				squash(ReportFixtures.MOBILITY_NOTE),
				squash(ReportFixtures.FALL_DESCRIPTION),
				squash(ReportFixtures.FINDING),
				squash("next spot check booked for 30 Sep."));
	}

	@Test
	void theFamilyVersionEndsWithItsDisclaimerAndSaysNothingTheFamilyIsNotShown() throws IOException {
		Report report = filed(40L, Report.Audience.FAMILY);

		byte[] pdf = renderer.render(report, EXPORTED);
		keep("family-report.pdf", pdf);
		String text = text(pdf);

		assertThat(text).contains("FAMILY VERSION · RPT-40", "Family report — Elder #1");
		assertThat(squash(text)).contains(squash("with the medical disclaimer"), squash(report.content().disclaimer()));
		assertThat(text).doesNotContain(ReportFixtures.MEDICAL_NOTES, ReportFixtures.FINDING, "EVERY READING");
	}

	@Test
	void theRegulatorVersionIsDrawnFromItsOwnText() throws IOException {
		byte[] pdf = renderer.render(filed(41L, Report.Audience.REGULATOR), EXPORTED);
		keep("regulator-report.pdf", pdf);

		assertThat(text(pdf)).contains("Regulator report — Elder #1", "REGULATOR VERSION · RPT-41")
				.doesNotContain(ReportFixtures.MEDICAL_NOTES);
	}

	@Test
	void aQuietCompletePeriodSaysSoAndHasNoGapsToShow() throws IOException {
		ReportContent quiet = ReportAssembler.forAudience(Report.Audience.INTERNAL).assemble(ReportFixtures.quietWeek());

		String text = text(renderer.render(report(43L, Report.Audience.INTERNAL, quiet, List.of()), EXPORTED));

		assertThat(text).doesNotContain("Data incomplete")
				.contains("No visits were scheduled in this period.", "No vital signs were recorded in this period.",
						"Nothing has been appended.");
	}

	@Test
	void aReportFiledBeforeSectionsCarriedNumbersIsPrintedAsItsText() throws IOException {
		Report old = ReportFixtures.stored(44L, Report.Audience.INTERNAL);

		String text = text(renderer.render(old, EXPORTED));

		assertThat(text).contains("Service completion", "3 visits: 1 scheduled, 2 verified.", "Data incomplete");
	}

	@Test
	void everyKindOfFigureAndChartIsDrawn() throws IOException {
		ReportContent content = new ReportContent(
				List.of(
						new ReportSection("overview", "Overview", "Elder #1 · 80–89\nCare plan version 3 · 6.5 h a week",
								List.of(ReportFigure.count("incidents", "Incidents", 0)), List.of()),
						new ReportSection("services", "Services", "Visit: 0 cancelled\nEscort: 1\nNo visits went ahead.",
								List.of(ReportFigure.share("visit", "Visit", 0, 0),
										new ReportFigure("escort", "Escort", BigDecimal.ONE, null, null)),
								List.of()),
						new ReportSection("service-completion", "Service completion",
								"Mon 14 Sep 09:00 · Personal care · verified", List.of(), List.of()),
						new ReportSection("vital-signs", "Vital signs", "Systolic 120–140 mmHg",
								List.of(),
								List.of(
										new ReportSeries("systolic", "Systolic", "mmHg", List.of(
												point("2026-09-14", "120", "140", false),
												point("2026-09-15", "125", "125", true))),
										new ReportSeries("pulse", "Pulse", null, List.of(point("2026-09-14", "72", "72", false))),
										new ReportSeries("weight", "Weight", "kg", List.of()))),
						new ReportSection("ratings-and-spot-checks", "Ratings and spot checks", "Mon 14 Sep · visit 11",
								List.of(
										new ReportFigure("rating", "Average visit rating", new BigDecimal("4.5"), null, null),
										ReportFigure.count("visit-ratings", "Visit ratings given this week", 2),
										ReportFigure.count("visits-disputed", "Visits disputed by the elder", 1),
										ReportFigure.count("periodic-reviews", "Periodic reviews by the family", 1),
										ReportFigure.count("spot-checks", "Spot checks carried out on site", 1)),
								List.of()),
						new ReportSection("Notes", "Written before sections had keys.")),
				true, List.of(), null, ReportContent.GeneratedBy.MODEL);

		byte[] pdf = renderer.render(report(45L, Report.Audience.INTERNAL, content, List.of()), EXPORTED);
		keep("every-figure.pdf", pdf);
		String text = text(pdf);

		assertThat(text).contains("Language-model summary", "Elder #1 · 80–89", "SYSTOLIC", "120–140 mmHg",
				"0 of 0", "Escort", "72", "WEIGHT", "1 point out of range", "4.5", "/ 5", "SPOT CHECKS CARRIED OUT ON SITE", "Notes",
				"Written before sections had keys.");
	}

	@Test
	void aLongReportRunsOverPagesAndEveryPageSaysWhatItBelongsTo() throws IOException {
		Report report = filed(46L, Report.Audience.INTERNAL);
		for (int i = 1; i <= 40; i++) {
			report = report.amend(ReportAmendment.Kind.CORRECTION,
					"Correction %d: ".formatted(i) + "the visit was moved at the family's request. ".repeat(6), 11L, NOTED);
		}

		byte[] pdf = renderer.render(report, EXPORTED);
		int pages = pages(pdf);
		String text = text(pdf);

		assertThat(pages).isGreaterThan(3);
		assertThat(text).contains("Page 1 of " + pages, "Page " + pages + " of " + pages, "Correction 40:");
		assertThat(text.split(Pattern.quote("RPT-46 · Internal report — Elder #1 · 14 Sep – 20 Sep 2026"), -1))
				.hasSize(pages + 1);
	}

	@Test
	void textTheStandardFontsCannotPrintNeitherStopsTheExportNorDisappears() throws IOException {
		String unbreakable = "x".repeat(400);
		Report report = ReportFixtures.stored(47L, Report.Audience.INTERNAL)
				.amend(ReportAmendment.Kind.CORRECTION, "家属 confirmed → visit moved ≥ 2 days 😀\tdone", 11L, NOTED)
				.amend(ReportAmendment.Kind.CORRECTION, unbreakable, 11L, NOTED);

		String text = text(renderer.render(report, EXPORTED));

		assertThat(text).contains("?? confirmed -> visit moved >= 2 days ? done");
		assertThat(squash(text)).contains(unbreakable);
	}

	// -------------------------------------------------------------------- helpers ---

	private static Report filed(Long id, Report.Audience audience) {
		return report(id, audience, ReportAssembler.forAudience(audience).assemble(ReportFixtures.week()), List.of());
	}

	private static Report report(Long id, Report.Audience audience, ReportContent content, List<ReportAmendment> notes) {
		return new Report(id, ReportFixtures.ELDER, 7L, 11L, audience, ReportFixtures.WEEK, Report.Status.PUBLISHED,
				content, notes, ReportFixtures.GENERATED_AT);
	}

	private static ReportSeries.Point point(String at, String low, String high, boolean flagged) {
		return new ReportSeries.Point(at, new BigDecimal(low), new BigDecimal(high), flagged);
	}

	private static String text(byte[] pdf) throws IOException {
		try (PDDocument document = Loader.loadPDF(pdf)) {
			return new PDFTextStripper().getText(document);
		}
	}

	private static int pages(byte[] pdf) throws IOException {
		try (PDDocument document = Loader.loadPDF(pdf)) {
			return document.getNumberOfPages();
		}
	}

	/** The text without line breaks or spaces, for something wrapped over several lines. */
	private static String squash(String text) {
		return text.replaceAll("\\s+", "");
	}

	private static void keep(String name, byte[] pdf) throws IOException {
		String folder = System.getProperty("carelink.report.pdf.samples");
		if (folder != null) {
			Files.createDirectories(Path.of(folder));
			Files.write(Path.of(folder, name), pdf);
		}
	}
}

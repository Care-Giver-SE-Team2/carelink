package sg.nus.carelink.report.infrastructure.pdf;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.report.domain.model.Report;
import sg.nus.carelink.report.domain.model.ReportAmendment;
import sg.nus.carelink.report.domain.model.ReportContent;
import sg.nus.carelink.report.domain.model.ReportFigure;
import sg.nus.carelink.report.domain.model.ReportPeriod;

/** The printed copy's words and formats, which are the report screen's. */
class ReportTextTest {

	@Test
	void aPeriodNamesItsYearOnceUnlessItCrossesOne() {
		assertThat(ReportText.period(new ReportPeriod(LocalDate.of(2026, 9, 14), LocalDate.of(2026, 9, 20))))
				.isEqualTo("14 Sep – 20 Sep 2026");
		assertThat(ReportText.period(new ReportPeriod(LocalDate.of(2026, 12, 28), LocalDate.of(2027, 1, 3))))
				.isEqualTo("28 Dec 2026 – 3 Jan 2027");
		assertThat(ReportText.period(new ReportPeriod(LocalDate.of(2026, 9, 14), LocalDate.of(2026, 9, 14))))
				.isEqualTo("14 Sep 2026");
	}

	@Test
	void aMomentIsADayAndATime() {
		assertThat(ReportText.moment(LocalDateTime.of(2026, 9, 20, 23, 0))).isEqualTo("20 Sep 2026 23:00");
		assertThat(ReportText.moment(null)).isEqualTo("not recorded");
	}

	@Test
	void numbersHaveAtMostTwoPlacesAndNoTrailingZeros() {
		assertThat(ReportText.number(new BigDecimal("66.666"))).isEqualTo("66.67");
		assertThat(ReportText.number(new BigDecimal("3.50"))).isEqualTo("3.5");
		assertThat(ReportText.number(new BigDecimal("100.00"))).isEqualTo("100");
		assertThat(ReportText.number(BigDecimal.ZERO)).isEqualTo("0");
	}

	@Test
	void aFigureReadsAsAShareAPercentageOrACount() {
		assertThat(ReportText.figure(ReportFigure.share("visits", "Visits", 2, 3))).isEqualTo("2 of 3");
		assertThat(ReportText.figure(new ReportFigure("fulfilment", "Fulfilment", new BigDecimal("66.67"), null, "%")))
				.isEqualTo("66.67%");
		assertThat(ReportText.figure(ReportFigure.count("incidents", "Incidents", 1))).isEqualTo("1");
	}

	@Test
	void everyLabelHasItsWords() {
		assertThat(ReportText.audience(Report.Audience.REGULATOR)).isEqualTo("Regulator");
		assertThat(ReportText.audienceNote(Report.Audience.REGULATOR)).startsWith("The full record");
		assertThat(ReportText.generatedBy(ReportContent.GeneratedBy.TEMPLATE)).isEqualTo("Structured template");
		assertThat(ReportText.status(Report.Status.DRAFT)).isEqualTo("Draft");
		assertThat(ReportText.status(Report.Status.ARCHIVED)).isEqualTo("Archived");
		assertThat(ReportText.kind(ReportAmendment.Kind.CORRECTION)).isEqualTo("Correction");
		assertThat(ReportText.upper("Visits carried out")).isEqualTo("VISITS CARRIED OUT");
	}
}

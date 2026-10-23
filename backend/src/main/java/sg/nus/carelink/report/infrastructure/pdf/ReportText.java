package sg.nus.carelink.report.infrastructure.pdf;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import sg.nus.carelink.report.domain.model.Report;
import sg.nus.carelink.report.domain.model.ReportAmendment;
import sg.nus.carelink.report.domain.model.ReportContent;
import sg.nus.carelink.report.domain.model.ReportFigure;
import sg.nus.carelink.report.domain.model.ReportPeriod;

/**
 * The words and number formats of the manager's report screens, for the printed copy: the
 * same labels and the same "14 Sep – 20 Sep 2026" as {@code features/reports/presentation.ts},
 * so a page and the PDF beside it read alike.
 */
final class ReportText {

	private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);
	private static final DateTimeFormatter DAY_OF_MONTH = DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH);
	private static final DateTimeFormatter MOMENT = DateTimeFormatter.ofPattern("d MMM yyyy HH:mm", Locale.ENGLISH);

	private ReportText() {
	}

	/** "14 Sep – 20 Sep 2026", "28 Dec 2026 – 3 Jan 2027" across a year end, one day as a day. */
	static String period(ReportPeriod period) {
		LocalDate start = period.start();
		LocalDate end = period.end();
		if (start.equals(end)) {
			return DAY.format(start);
		}
		String first = start.getYear() == end.getYear() ? DAY_OF_MONTH.format(start) : DAY.format(start);
		return first + " – " + DAY.format(end);
	}

	/** "20 Sep 2026 23:00". */
	static String moment(LocalDateTime at) {
		return at == null ? "not recorded" : MOMENT.format(at);
	}

	/** A number as the report writes it: at most two places, no trailing zeros. */
	static String number(BigDecimal value) {
		return value.setScale(2, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
	}

	/** "2 of 3", "66.67%", "1". */
	static String figure(ReportFigure figure) {
		if ("%".equals(figure.unit())) {
			return number(figure.value()) + "%";
		}
		if (figure.outOf() != null) {
			return number(figure.value()) + " of " + number(figure.outOf());
		}
		return number(figure.value());
	}

	static String upper(String text) {
		return text.toUpperCase(Locale.ROOT);
	}

	static String audience(Report.Audience audience) {
		return switch (audience) {
			case FAMILY -> "Family";
			case REGULATOR -> "Regulator";
			case INTERNAL -> "Internal";
		};
	}

	/** What each reader's version leaves out, in a line. */
	static String audienceNote(Report.Audience audience) {
		return switch (audience) {
			case FAMILY -> "Caregivers by name, vital signs as ranges, no medical notes or inspection findings, "
					+ "with the medical disclaimer";
			case REGULATOR -> "The full record with the elder and caregivers by number; notes, comments and "
					+ "findings counted, not quoted";
			case INTERNAL -> "Everything, names, medical notes and findings included";
		};
	}

	static String generatedBy(ReportContent.GeneratedBy generatedBy) {
		return switch (generatedBy) {
			case MODEL -> "Language-model summary";
			case TEMPLATE -> "Structured template";
		};
	}

	static String status(Report.Status status) {
		return switch (status) {
			case DRAFT -> "Draft";
			case PUBLISHED -> "Published";
			case ARCHIVED -> "Archived";
		};
	}

	static String kind(ReportAmendment.Kind kind) {
		return switch (kind) {
			case CORRECTION -> "Correction";
			case FOLLOW_UP -> "Follow-up";
		};
	}
}

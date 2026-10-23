package sg.nus.carelink.report.infrastructure.pdf;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Reading a section line into its time, its status and the rest, the way the manager's screen
 * reads it ({@code reportLine} in features/reports/presentation.ts), so a row on paper says
 * what the same row on screen says.
 */
class ReportLineTest {

	@Test
	void aVisitLineSplitsIntoItsTimeItsStatusAndTheRest() {
		ReportLine line = ReportLine.parse(
				"Mon 14 Sep 09:00 · Personal care · Daniel Goh (caregiver #3) · verified · evidence 2 of 2 verified", false);

		assertThat(line.time()).isEqualTo("Mon 14 Sep 09:00");
		assertThat(line.status()).isEqualTo(new ReportLine.Status("verified", ReportLine.Tone.OK));
		assertThat(line.parts()).containsExactly("Personal care", "Daniel Goh (caregiver #3)", "evidence 2 of 2 verified");
		assertThat(line.plain()).isFalse();
	}

	@Test
	void aSentenceIsPlainAndKeptWhole() {
		ReportLine line = ReportLine.parse("3 visits: 1 scheduled, 2 verified.", false);

		assertThat(line.time()).isNull();
		assertThat(line.status()).isNull();
		assertThat(line.parts()).containsExactly("3 visits: 1 scheduled, 2 verified.");
		assertThat(line.plain()).isTrue();
		assertThat(line.withoutTime()).isEqualTo(line.text());
	}

	@Test
	void aSpanOfDaysIsATime() {
		ReportLine line = ReportLine.parse("14 Sep – 20 Sep · Review of Daniel Goh (caregiver #3) · overall 4", false);

		assertThat(line.time()).isEqualTo("14 Sep – 20 Sep");
		assertThat(line.status()).isNull();
		assertThat(line.plain()).isFalse();
	}

	@Test
	void aPartOnItsOwnIsNeverTakenForAStatus() {
		assertThat(ReportLine.parse("verified", false).status()).isNull();
	}

	@Test
	void onlyTheFirstStatusIsTheStatus() {
		ReportLine line = ReportLine.parse("Fri 18 Sep 09:00 · scheduled · cancelled", false);

		assertThat(line.status().text()).isEqualTo("scheduled");
		assertThat(line.parts()).containsExactly("cancelled");
	}

	@ParameterizedTest
	@CsvSource(delimiter = '|', quoteCharacter = '"', value = {
			"resolved Tue 15 Sep 11:02|OK",
			"RESOLVED|OK",
			"approved and booked as visit 15|OK",
			"Wei Ling took the visit|OK",
			"replaced by Ahmad|OK",
			"awaiting the family|WARN",
			"in progress|WARN",
			"ACKNOWLEDGED|WARN",
			"OPEN|BAD",
			"needs improvement|BAD",
			"out of range|BAD",
			"cancelled at the family's request|NEUTRAL",
			"rescheduled with the family|NEUTRAL"})
	void eachStateTheAssemblersWriteHasItsTone(String status, ReportLine.Tone tone) {
		ReportLine line = ReportLine.parse("incident 2 · " + status, false);

		assertThat(line.status()).isEqualTo(new ReportLine.Status(status, tone));
	}

	@Test
	void aPartThatOnlyContainsAStateIsNotOne() {
		assertThat(ReportLine.parse("visit 12 · evidence 2 of 2 verified", false).status()).isNull();
	}

	@Test
	void aBodyBecomesLinesWithTheTimelineStepsMarked() {
		List<ReportLine> lines = ReportLine.of("""
				Tue 15 Sep 10:15 · incident 2 · RESOLVED

				  Tue 15 Sep 10:21 · CLAIMED · Ben Lim (demo-ben) · taken over
				  Resolution: HANDLED_ON_SITE""");

		assertThat(lines).hasSize(3);
		assertThat(lines.get(0).nested()).isFalse();
		assertThat(lines.get(1).nested()).isTrue();
		assertThat(lines.get(1).text()).startsWith("Tue 15 Sep 10:21");
		assertThat(lines.get(1).withoutTime()).isEqualTo("CLAIMED · Ben Lim (demo-ben) · taken over");
		assertThat(lines.get(2).plain()).isTrue();
	}
}

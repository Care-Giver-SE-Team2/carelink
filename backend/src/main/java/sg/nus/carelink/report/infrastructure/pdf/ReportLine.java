package sg.nus.carelink.report.infrastructure.pdf;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * One line of a section body, split into what a row shows: when it happened, how it stands,
 * and the rest.
 *
 * <p>The same reading as {@code reportLine} in the front end's
 * {@code features/reports/presentation.ts}, so a row reads the same on paper as on screen. The
 * assemblers join a line's parts with " · "; a part that is a day or a span of days is the
 * time, and a part that is one of the states they write is the status. A line written as a
 * sentence has neither and is printed whole.
 *
 * @param nested a step of an incident's timeline, indented under the incident
 * @param time   "Tue 15 Sep 10:15", "Mon 14 Sep" or "14 Sep – 20 Sep"; null when there is none
 * @param parts  the other parts in the report's order
 * @param status null when no part says how the thing stands
 */
record ReportLine(String text, boolean nested, String time, List<String> parts, Status status) {

	static final String SEPARATOR = " · ";

	/** How a status reads at a glance: done, waiting, wrong, or neither. */
	enum Tone {
		OK, WARN, BAD, NEUTRAL
	}

	record Status(String text, Tone tone) {
	}

	private static final String MONTHS = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
	private static final Pattern DAY_PART =
			Pattern.compile("^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \\d{1,2} " + MONTHS + "( \\d{2}:\\d{2})?$");
	private static final Pattern SPAN_PART = Pattern.compile("^\\d{1,2} " + MONTHS + " – \\d{1,2} " + MONTHS + "$");

	/*
	 * The states the sections write, as the assemblers word them. A part has to be one of
	 * these whole: "evidence 2 of 2 verified" is not "verified". Checked in order.
	 */
	private static final List<Map.Entry<Pattern, Tone>> STATUSES = List.of(
			Map.entry(Pattern.compile("^(verified|done|approved|meets the standard)$"), Tone.OK),
			Map.entry(Pattern.compile("^resolved( .+)?$", Pattern.CASE_INSENSITIVE), Tone.OK),
			Map.entry(Pattern.compile("^approved and booked( as visit \\d+)?$"), Tone.OK),
			Map.entry(Pattern.compile(" took the visit$"), Tone.OK),
			Map.entry(Pattern.compile("^replaced by .+$"), Tone.OK),
			Map.entry(Pattern.compile(
					"^(scheduled|caregiver arrived|in progress|awaiting the elder's confirmation|planned)$"), Tone.WARN),
			Map.entry(Pattern.compile("^(still being followed up|waiting for the family's choice|awaiting the family"
					+ "|awaiting the family's approval|awaiting the family's consent)$"), Tone.WARN),
			Map.entry(Pattern.compile("^(OPEN|UNRESOLVED_ESCALATED)$"), Tone.BAD),
			Map.entry(Pattern.compile("^(ACKNOWLEDGED|IN_PROGRESS)$"), Tone.WARN),
			Map.entry(Pattern.compile("^(ended in an exception|needs improvement|the caregiver did not turn up"
					+ "|no replacement found yet|uncovered|out of range)$"), Tone.BAD),
			Map.entry(Pattern.compile("^(cancelled|cancelled at the family's request"
					+ "|closed without the elder's confirmation|declined|declined by the family|withdrawn|called off"
					+ "|skipped|skipped at the family's request|moved to another time)$"), Tone.NEUTRAL),
			Map.entry(Pattern.compile("^rescheduled( with .+)?$"), Tone.NEUTRAL));

	ReportLine {
		parts = List.copyOf(parts);
	}

	/** A section body as lines: one item per line, the steps of a timeline indented by two spaces. */
	static List<ReportLine> of(String body) {
		return body.lines()
				.filter(line -> !line.isBlank())
				.map(line -> parse(line.strip(), line.startsWith("  ")))
				.toList();
	}

	static ReportLine parse(String text, boolean nested) {
		List<String> all = Arrays.asList(text.split(SEPARATOR, -1));
		int timeAt = -1;
		for (int i = 0; i < all.size() && timeAt < 0; i++) {
			if (DAY_PART.matcher(all.get(i)).find() || SPAN_PART.matcher(all.get(i)).find()) {
				timeAt = i;
			}
		}
		List<String> rest = new ArrayList<>(all);
		if (timeAt >= 0) {
			rest.remove(timeAt);
		}
		Status status = null;
		List<String> parts = new ArrayList<>();
		for (String part : rest) {
			Tone tone = status == null && rest.size() > 1 ? toneOf(part) : null;
			if (tone == null) {
				parts.add(part);
			} else {
				status = new Status(part, tone);
			}
		}
		return new ReportLine(text, nested, timeAt < 0 ? null : all.get(timeAt), parts, status);
	}

	private static Tone toneOf(String part) {
		return STATUSES.stream()
				.filter(entry -> entry.getKey().matcher(part).find())
				.map(Map.Entry::getValue)
				.findFirst()
				.orElse(null);
	}

	/** Neither a time nor a status: a sentence, printed as it is. */
	boolean plain() {
		return time == null && status == null;
	}

	/** The line without its time: what a timeline step says happened. */
	String withoutTime() {
		if (time == null) {
			return text;
		}
		return String.join(SEPARATOR, Arrays.stream(text.split(SEPARATOR, -1)).filter(part -> !part.equals(time)).toList());
	}
}

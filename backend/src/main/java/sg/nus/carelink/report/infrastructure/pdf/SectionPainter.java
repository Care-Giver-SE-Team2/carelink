package sg.nus.carelink.report.infrastructure.pdf;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import sg.nus.carelink.report.domain.model.ReportAmendment;
import sg.nus.carelink.report.domain.model.ReportFigure;
import sg.nus.carelink.report.domain.model.ReportSection;
import sg.nus.carelink.report.domain.model.ReportSeries;
import sg.nus.carelink.report.infrastructure.pdf.PageFlow.Ink;
import sg.nus.carelink.report.infrastructure.pdf.PageFlow.Type;

/**
 * Draws the body of a report the way the manager's screen lays it out (ReportSectionCard in the
 * front end): each section's numbers first, then what it says, laid out for the kind of section
 * it is - tiles for the overview, a bar per service, a chart per vital sign, quotes for the
 * caregivers' notes, and rows with a status for everything that happened at a time.
 *
 * <p>The words are the report's own. A line is split on its " · " into when, what and how it
 * stands ({@link ReportLine}); a line that does not split is printed whole, and a section filed
 * before figures and series existed is printed as its text.
 */
final class SectionPainter {

	/** The overview's closing sentences, which state its numbers in words: "Visits: 2 of 3 carried out (66.67%)." */
	private static final Pattern NUMBER_SENTENCE = Pattern.compile("^(Visits|Vital signs|Incidents|Visit ratings): ");
	/** "Medical notes: Hypertension." - a label of a few words, then what it labels. */
	private static final Pattern LABELLED = Pattern.compile("^([A-Z][A-Za-z ]{1,28}): (.+)$");
	/** The overview's numbers a manager should not pass over when they are not zero. */
	private static final Set<String> ALERTS = Set.of("out-of-range", "incidents");

	private static final float GAP = 8;
	private static final float TIME_COLUMN = 96;
	private static final float LABEL_COLUMN = 112;
	private static final float ROW_PAD = 6;
	private static final float PILL_HEIGHT = 11.5f;
	private static final float TILE_HEIGHT = 64;
	private static final float CHART_HEIGHT = 80;
	private static final float PLOT_HEIGHT = 30;
	private static final float PLOT_PAD = 4;
	private static final float STAR = 8.5f;
	private static final float STAR_GAP = 1.5f;
	private static final BigDecimal RATING_SCALE = BigDecimal.valueOf(5);

	/** The console's star, on its 20-unit grid. */
	private static final float[][] STAR_SHAPE = {
			{10, 1.5f}, {12.6f, 6.9f}, {18.5f, 7.7f}, {14.2f, 11.8f}, {15.2f, 17.7f},
			{10, 15}, {4.8f, 17.7f}, {5.8f, 11.8f}, {1.5f, 7.7f}, {7.4f, 6.9f}};
	/** Its left half, for a rating that ends in a half. */
	private static final float[][] HALF_STAR = {
			{10, 1.5f}, {7.4f, 6.9f}, {1.5f, 7.7f}, {5.8f, 11.8f}, {4.8f, 17.7f}, {10, 15}};

	private final PageFlow flow;
	private final ReportStyle style;

	SectionPainter(PageFlow flow, ReportStyle style) {
		this.flow = flow;
		this.style = style;
	}

	/** One section, below its heading. */
	void paint(ReportSection section) throws IOException {
		List<ReportLine> lines = ReportLine.of(section.body());
		switch (section.key()) {
			case "overview" -> overview(section.figures(), lines);
			case "services" -> services(section.figures(), lines);
			case "service-completion" -> completion(lines);
			case "vital-signs" -> vitals(section.series(), lines);
			case "observations" -> quotes(lines);
			case "ratings-and-spot-checks" -> ratings(section.figures(), lines);
			default -> rows(lines);
		}
	}

	/** How tall the first thing a section draws is, so its heading is never left alone at the foot of a page. */
	float opening(ReportSection section) {
		return switch (section.key()) {
			case "overview" -> section.figures().isEmpty() ? 2 * style.body.leading() : TILE_HEIGHT;
			case "vital-signs" -> section.series().isEmpty() ? 2 * style.body.leading() : CHART_HEIGHT;
			default -> 2 * style.body.leading();
		};
	}

	/** How tall the first note is, or the line saying there are none. */
	float notesOpening() {
		return PILL_HEIGHT + 4 + style.body.leading();
	}

	/** The notes appended to the report, oldest first, each with its kind, its author and when. */
	void notes(List<ReportAmendment> amendments) throws IOException {
		if (amendments.isEmpty()) {
			flow.paragraph("Nothing has been appended.", style.note, flow.left(), flow.width());
			return;
		}
		for (int i = 0; i < amendments.size(); i++) {
			ReportAmendment amendment = amendments.get(i);
			separate(i == 0, PILL_HEIGHT + 4 + style.body.leading());
			float top = flow.cursor();
			String tag = ReportText.upper(ReportText.kind(amendment.kind()));
			pill(tag, amendment.kind() == ReportAmendment.Kind.FOLLOW_UP ? ReportLine.Tone.OK : ReportLine.Tone.NEUTRAL,
					flow.left(), top, PILL_HEIGHT);
			flow.text(ReportText.moment(amendment.createdAt()) + ReportLine.SEPARATOR + "user #" + amendment.authorUserId(),
					style.note, flow.left() + pillWidth(tag) + 8, PageFlow.baseline(top, PILL_HEIGHT, style.note.size()));
			flow.advance(PILL_HEIGHT + 4);
			flow.paragraph(amendment.note(), style.body, flow.left(), flow.width());
			flow.advance(ROW_PAD);
		}
	}

	// ------------------------------------------------------------------- sections ---

	/** The numbers as tiles, then what the reader is told about the elder, then the numbers in words. */
	private void overview(List<ReportFigure> figures, List<ReportLine> lines) throws IOException {
		if (!figures.isEmpty()) {
			tiles(figures);
		}
		List<String> numbers = new ArrayList<>();
		for (ReportLine line : lines) {
			if (NUMBER_SENTENCE.matcher(line.text()).find()) {
				numbers.add(line.text());
			} else {
				fact(line.text());
			}
		}
		if (!numbers.isEmpty()) {
			flow.advance(4);
			flow.paragraph(String.join(" ", numbers), style.note, flow.left(), flow.width());
		}
	}

	/** A line about the elder: "Medical notes: ..." as a label beside its value, anything else as it is. */
	private void fact(String text) throws IOException {
		Matcher labelled = LABELLED.matcher(text);
		if (!labelled.matches()) {
			flow.paragraph(text, style.body, flow.left(), flow.width());
			return;
		}
		float x = flow.left() + LABEL_COLUMN;
		List<String> value = flow.wrap(labelled.group(2), style.body, flow.right() - x);
		flow.ensure(style.body.leading());
		flow.text(ReportText.upper(labelled.group(1)), style.label, flow.left(),
				PageFlow.baseline(flow.cursor(), style.body));
		flow.lines(value, style.body, x);
	}

	/** A bar per kind of service, then the lines after the ones those bars already state. */
	private void services(List<ReportFigure> figures, List<ReportLine> lines) throws IOException {
		for (ReportFigure figure : figures) {
			flow.ensure(style.body.leading() + 10);
			float baseline = PageFlow.baseline(flow.cursor(), style.body);
			flow.text(figure.label(), style.body, flow.left(), baseline);
			flow.textRight(ReportText.figure(figure), style.figureText, flow.right(), baseline);
			flow.advance(style.body.leading() + 1);
			if (figure.outOf() != null) {
				meter(flow.left(), flow.cursor(), flow.width(), figure.value(), figure.outOf());
			}
			flow.advance(10);
		}
		rows(lines.subList(Math.min(figures.size(), lines.size()), lines.size()));
	}

	/** The tally - "3 visits: 1 scheduled, 2 verified." - then a row per visit. */
	private void completion(List<ReportLine> lines) throws IOException {
		if (lines.isEmpty() || lines.getFirst().time() != null) {
			rows(lines);
			return;
		}
		flow.paragraph(lines.getFirst().text(), style.note, flow.left(), flow.width());
		flow.advance(4);
		rows(lines.subList(1, lines.size()));
	}

	/**
	 * A chart per metric with its range, then every reading for the versions that list them. The
	 * family's version lists none and writes each range out; that range is shown as written.
	 */
	private void vitals(List<ReportSeries> series, List<ReportLine> lines) throws IOException {
		if (series.isEmpty()) {
			rows(lines);
			return;
		}
		List<ReportLine> readings = lines.stream().filter(line -> line.time() != null).toList();
		grid(series.size(), series.size() <= 2 ? 2 : 4, CHART_HEIGHT, (index, x, top, width) -> chart(
				series.get(index), readings.isEmpty() ? rangeAsWritten(series.get(index), lines) : null, x, top, width));
		if (readings.isEmpty()) {
			return;
		}
		flow.ensure(style.label.leading() + style.note.leading());
		flow.text("EVERY READING (" + readings.size() + ")", style.label, flow.left(),
				PageFlow.baseline(flow.cursor(), style.label));
		flow.advance(style.label.leading());
		for (ReportLine reading : readings) {
			ReportLine.Status status = reading.status();
			boolean flagged = status != null && status.tone() == ReportLine.Tone.BAD;
			flow.paragraph(reading.text(), flagged ? style.note.in(ReportStyle.DANGER) : style.note,
					flow.left(), flow.width());
		}
	}

	/** The caregivers' notes as quotes under who wrote them and when; a sentence about them stays a sentence. */
	private void quotes(List<ReportLine> lines) throws IOException {
		for (ReportLine line : lines) {
			int at = line.text().indexOf(": ");
			if (at < 0) {
				flow.paragraph(line.text(), style.note, flow.left(), flow.width());
			} else {
				flow.ensure(style.cite.leading() + style.body.leading());
				barred(flow.wrap(line.text().substring(0, at), style.cite, flow.width() - 12), style.cite, flow.left() + 2);
				barred(flow.wrap(line.text().substring(at + 2), style.body, flow.width() - 12), style.body, flow.left() + 2);
			}
			flow.advance(6);
		}
	}

	/** The rating with its stars and the counts beside it, then a row per rating, review and spot check. */
	private void ratings(List<ReportFigure> figures, List<ReportLine> lines) throws IOException {
		if (!figures.isEmpty()) {
			ratingHead(figures);
		}
		rows(lines);
	}

	private void ratingHead(List<ReportFigure> figures) throws IOException {
		flow.ensure(30);
		ReportFigure rating = figures.stream().filter(figure -> "rating".equals(figure.key())).findFirst().orElse(null);
		// The counts sit on the large rating's baseline; without a rating they need no room above them.
		float baseline = flow.cursor() - (rating == null ? 9 : 17);
		float x = flow.left();
		if (rating != null) {
			String value = ReportText.number(rating.value());
			flow.text(value, style.figure, x, baseline);
			x += flow.width(value, style.figure) + 3;
			String outOf = "/ " + ReportText.number(rating.outOf() == null ? RATING_SCALE : rating.outOf());
			flow.text(outOf, style.figureOf, x, baseline);
			x += flow.width(outOf, style.figureOf) + 6;
			stars(x, baseline + STAR - 1, rating.value());
			x += 5 * (STAR + STAR_GAP) + 14;
		}
		for (ReportFigure figure : figures) {
			if (figure == rating) {
				continue;
			}
			String label = ReportText.upper(figure.label());
			String value = ReportText.figure(figure);
			float labelWidth = flow.width(label, style.label);
			if (x + labelWidth + 4 + flow.width(value, style.figureText) > flow.right()) {
				x = flow.left();
				baseline -= 14;
			}
			flow.text(label, style.label, x, baseline);
			flow.text(value, style.figureText, x + labelWidth + 4, baseline);
			x += labelWidth + 4 + flow.width(value, style.figureText) + 14;
		}
		flow.advance(flow.cursor() - baseline + 9);
	}

	// ----------------------------------------------------------------------- rows ---

	/** A line and the steps of its timeline, indented under it. */
	private record Row(ReportLine head, List<ReportLine> steps) {
	}

	/** Lines as rows: when, what, and how it stands. */
	private void rows(List<ReportLine> lines) throws IOException {
		List<Row> rows = new ArrayList<>();
		for (ReportLine line : lines) {
			if (line.nested() && !rows.isEmpty()) {
				rows.getLast().steps().add(line);
			} else {
				rows.add(new Row(line, new ArrayList<>()));
			}
		}
		for (int i = 0; i < rows.size(); i++) {
			row(rows.get(i), i == 0);
		}
	}

	private void row(Row row, boolean first) throws IOException {
		ReportLine head = row.head();
		String time = head.time();
		ReportLine.Status status = head.status();
		float pillSpace = status == null ? 0 : pillWidth(status.text()) + 10;
		float x = head.plain() ? flow.left() : flow.left() + TIME_COLUMN;
		float width = flow.right() - x - pillSpace;
		List<String> main = flow.wrap(head.plain() ? head.text() : firstPart(head), style.body, width);
		List<String> detail = head.plain() || head.parts().size() < 2
				? List.of()
				: flow.wrap(String.join(ReportLine.SEPARATOR, head.parts().subList(1, head.parts().size())), style.detail,
						width);
		separate(first, style.body.leading() + (detail.isEmpty() ? 0 : style.detail.leading()));
		float top = flow.cursor();
		if (time != null) {
			flow.text(time, style.time, flow.left(), PageFlow.baseline(top, style.body));
		}
		if (status != null) {
			pill(status.text(), status.tone(), flow.right() - pillSpace + 10, top, style.body.leading());
		}
		if (main.isEmpty()) {
			flow.advance(style.body.leading());
		}
		flow.lines(main, style.body, x);
		flow.lines(detail, style.detail, x);
		steps(row.steps(), x);
		flow.advance(ROW_PAD);
	}

	/** An incident's timeline under it: each step's time, then what happened. */
	private void steps(List<ReportLine> steps, float x) throws IOException {
		if (steps.isEmpty()) {
			return;
		}
		flow.advance(3);
		for (ReportLine step : steps) {
			String text = step.time() == null ? step.text() : step.time() + "  " + step.withoutTime();
			barred(flow.wrap(text, style.step, flow.right() - x - 10), style.step, x);
		}
	}

	private static String firstPart(ReportLine line) {
		return line.parts().isEmpty() ? "" : line.parts().getFirst();
	}

	/** Keeps {@code height} on one page; draws the rule between two rows unless this is the first. */
	private void separate(boolean first, float height) throws IOException {
		flow.ensure((first ? 0 : ROW_PAD) + height);
		if (!first) {
			flow.rule(flow.cursor(), ReportStyle.BORDER_LIGHT, 0.5f);
			flow.advance(ROW_PAD);
		}
	}

	/** Lines with a bar down their left, as the console sets quotes and timelines. */
	private void barred(List<String> lines, Type type, float x) throws IOException {
		for (String line : lines) {
			flow.ensure(type.leading());
			float top = flow.cursor();
			flow.line(x, top, x, top - type.leading(), ReportStyle.BORDER, 1.2f);
			flow.text(line, type, x + 8, PageFlow.baseline(top, type));
			flow.advance(type.leading());
		}
	}

	private float pillWidth(String text) throws IOException {
		return flow.width(text, style.pill) + 8;
	}

	/** A status in a box, coloured by its tone, centred on a line {@code lineHeight} tall. */
	private void pill(String text, ReportLine.Tone tone, float x, float top, float lineHeight) throws IOException {
		Ink ink = ReportStyle.of(tone);
		float pillTop = top - (lineHeight - PILL_HEIGHT) / 2;
		flow.box(x, pillTop, pillWidth(text), PILL_HEIGHT,
				tone == ReportLine.Tone.BAD ? ReportStyle.DANGER_TINT : null,
				tone == ReportLine.Tone.NEUTRAL ? ReportStyle.BORDER : ink);
		flow.text(text, style.pill.in(ink), x + 4, PageFlow.baseline(pillTop, PILL_HEIGHT, style.pill.size()));
	}

	// -------------------------------------------------------------------- figures ---

	/** Draws one box of a grid. */
	@FunctionalInterface
	private interface Cell {
		void draw(int index, float x, float top, float width) throws IOException;
	}

	/** {@code count} boxes of one height, {@code columns} to a row, a row never split over two pages. */
	private void grid(int count, int columns, float height, Cell cell) throws IOException {
		float width = (flow.width() - GAP * (columns - 1)) / columns;
		for (int first = 0; first < count; first += columns) {
			flow.ensure(height);
			float top = flow.cursor();
			for (int i = first; i < Math.min(first + columns, count); i++) {
				cell.draw(i, flow.left() + (i - first) * (width + GAP), top, width);
			}
			flow.advance(height + GAP);
		}
	}

	/** The overview's numbers as tiles; the fulfilment is said under the visits rather than on a tile of its own. */
	private void tiles(List<ReportFigure> figures) throws IOException {
		ReportFigure fulfilment = figures.stream()
				.filter(figure -> "fulfilment".equals(figure.key())).findFirst().orElse(null);
		List<ReportFigure> shown = figures.stream().filter(figure -> figure != fulfilment).toList();
		grid(shown.size(), Math.clamp(shown.size(), 3, 4), TILE_HEIGHT,
				(index, x, top, width) -> tile(shown.get(index), fulfilment, x, top, width));
	}

	private void tile(ReportFigure figure, ReportFigure fulfilment, float x, float top, float width) throws IOException {
		flow.box(x, top, width, TILE_HEIGHT, ReportStyle.SURFACE, ReportStyle.BORDER_LIGHT);
		float inner = x + 10;
		float baseline = top - 24;
		boolean alert = ALERTS.contains(figure.key()) && figure.value().signum() > 0;
		String value = ReportText.number(figure.value());
		flow.text(value, alert ? style.figure.in(ReportStyle.DANGER) : style.figure, inner, baseline);
		if (figure.outOf() != null) {
			flow.text("/ " + ReportText.number(figure.outOf()), style.figureOf,
					inner + flow.width(value, style.figure) + 3, baseline);
		}
		flow.text(ReportText.upper(figure.label()), style.label, inner, top - 36);
		if ("visits".equals(figure.key()) && figure.outOf() != null) {
			meter(inner, top - 43, width - 20, figure.value(), figure.outOf());
			if (fulfilment != null) {
				flow.text(ReportText.figure(fulfilment) + " as planned", style.note, inner, top - 55);
			}
		}
		if ("rating".equals(figure.key())) {
			stars(inner, top - 42, figure.value());
		}
	}

	/** How far {@code value} got of {@code outOf}, as a bar. */
	private void meter(float x, float top, float width, BigDecimal value, BigDecimal outOf) throws IOException {
		flow.box(x, top, width, 3, ReportStyle.BORDER_LIGHT, null);
		double share = outOf.signum() > 0 ? Math.clamp(value.doubleValue() / outOf.doubleValue(), 0, 1) : 0;
		if (share > 0) {
			flow.box(x, top, (float) (width * share), 3, ReportStyle.ACCENT, null);
		}
	}

	/** Five stars, filled up to the rating, the last one by half when the rating ends in a half. */
	private void stars(float x, float top, BigDecimal value) throws IOException {
		double rating = value.doubleValue();
		float scale = STAR / 20;
		for (int place = 1; place <= 5; place++) {
			float at = x + (place - 1) * (STAR + STAR_GAP);
			flow.shape(STAR_SHAPE, at, top, scale, rating >= place ? ReportStyle.ACCENT : ReportStyle.BORDER);
			if (rating < place && rating >= place - 0.5) {
				flow.shape(HALF_STAR, at, top, scale, ReportStyle.ACCENT);
			}
		}
	}

	/** One metric as a card: its name, its range, a small chart of how it moved, and how often it was out of range. */
	private void chart(ReportSeries series, String written, float x, float top, float width) throws IOException {
		List<ReportSeries.Point> points = series.points();
		flow.box(x, top, width, CHART_HEIGHT, null, ReportStyle.BORDER_LIGHT);
		float inner = x + 8;
		flow.text(ReportText.upper(series.label()), style.label, inner, top - 12);
		flow.text(written != null ? written : span(series), style.range, inner, top - 25);
		if (!points.isEmpty()) {
			plot(points, inner, top - 31, width - 16);
		}
		long flagged = points.stream().filter(ReportSeries.Point::flagged).count();
		if (flagged > 0) {
			flow.text(flagged + (flagged == 1 ? " point" : " points") + " out of range",
					style.note.in(ReportStyle.DANGER), inner, top - CHART_HEIGHT + 7);
		}
	}

	/**
	 * The points spaced evenly in the order they were taken and scaled between the lowest and
	 * highest of the series, as the screen's sparkline() places them. A day's range is a bar
	 * from its lowest to its highest reading; a flagged point is marked.
	 */
	private void plot(List<ReportSeries.Point> points, float x, float top, float width) throws IOException {
		BigDecimal max = points.stream().map(ReportSeries.Point::high).max(BigDecimal::compareTo).orElseThrow();
		double span = max.subtract(points.stream().map(ReportSeries.Point::low).min(BigDecimal::compareTo).orElseThrow())
				.doubleValue();
		int count = points.size();
		float step = count == 1 ? 0 : (width - 2 * PLOT_PAD) / (count - 1);
		flow.line(x, top - PLOT_PAD, x + width, top - PLOT_PAD, ReportStyle.BORDER_LIGHT, 0.5f);
		flow.line(x, top - PLOT_HEIGHT + PLOT_PAD, x + width, top - PLOT_HEIGHT + PLOT_PAD, ReportStyle.BORDER_LIGHT, 0.5f);
		float[] xs = new float[count];
		float[] lows = new float[count];
		float[] highs = new float[count];
		float[] mids = new float[count];
		for (int i = 0; i < count; i++) {
			xs[i] = x + (count == 1 ? width / 2 : PLOT_PAD + i * step);
			lows[i] = top - depth(points.get(i).low(), max, span);
			highs[i] = top - depth(points.get(i).high(), max, span);
			mids[i] = (lows[i] + highs[i]) / 2;
		}
		if (count > 1) {
			flow.polyline(xs, mids, ReportStyle.TERTIARY, 0.9f);
		}
		for (int i = 0; i < count; i++) {
			ReportSeries.Point point = points.get(i);
			if (point.low().compareTo(point.high()) != 0) {
				flow.bar(xs[i], lows[i], highs[i], ReportStyle.FAINT, 2.6f);
			}
			flow.dot(xs[i], mids[i], point.flagged() ? 2.3f : 1.4f, point.flagged() ? ReportStyle.DANGER : ReportStyle.INK);
		}
	}

	/** How far below the top of the plot a value sits. */
	private static float depth(BigDecimal value, BigDecimal max, double span) {
		return span == 0
				? PLOT_HEIGHT / 2
				: (float) (PLOT_PAD + max.subtract(value).doubleValue() / span * (PLOT_HEIGHT - 2 * PLOT_PAD));
	}

	/** "128–142 mmHg": the lowest and highest of the series' points. */
	private static String span(ReportSeries series) {
		if (series.points().isEmpty()) {
			return "";
		}
		BigDecimal min = series.points().stream().map(ReportSeries.Point::low).min(BigDecimal::compareTo).orElseThrow();
		BigDecimal max = series.points().stream().map(ReportSeries.Point::high).max(BigDecimal::compareTo).orElseThrow();
		String span = min.compareTo(max) == 0
				? ReportText.number(min)
				: ReportText.number(min) + "–" + ReportText.number(max);
		return series.unit() == null ? span : span + " " + series.unit();
	}

	/** The range as the family's version writes it - "Systolic 128–142 mmHg" - when it does. */
	private static String rangeAsWritten(ReportSeries series, List<ReportLine> lines) {
		String prefix = series.label() + " ";
		return lines.stream()
				.map(ReportLine::text)
				.filter(text -> text.startsWith(prefix))
				.map(text -> text.substring(prefix.length()))
				.findFirst()
				.orElse(null);
	}
}

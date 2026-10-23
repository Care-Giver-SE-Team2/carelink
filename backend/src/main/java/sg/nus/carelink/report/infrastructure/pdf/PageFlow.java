package sg.nus.carelink.report.infrastructure.pdf;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;

/**
 * Pages, a cursor, and the few things a report is drawn with: text that wraps, rules, boxes,
 * dots and filled shapes.
 *
 * <p>PDF has no layout of its own - every string is put at a point - so this is the part that
 * knows where the next thing goes. Content runs from the top of a page down, and anything that
 * would not fit above the footer starts a new page. Positions are PDF points from the
 * bottom-left corner, as PDFBox takes them; a {@code top} is always the upper edge of the thing
 * being drawn.
 *
 * <p>Text is set in the standard PDF fonts, which every reader has, so nothing is embedded and
 * the file stays small. They cover Western European text. A character outside it is printed as
 * "?" rather than failing the export; the report on screen still shows it as written.
 */
final class PageFlow {

	static final PDRectangle PAGE = PDRectangle.A4;
	static final float MARGIN = 50;
	/** Where the first thing on a page starts. */
	static final float TOP = PAGE.getHeight() - 46;
	/** Nothing but the footer goes below this. */
	static final float BOTTOM = 62;

	/** How far a quarter circle's control points sit from its ends, as a share of the radius. */
	private static final float KAPPA = 0.5523f;
	/** Characters the standard fonts lack that have an obvious plain spelling. */
	private static final Map<Integer, String> STAND_INS = Map.of(
			(int) '→', "->", (int) '←', "<-", (int) '≤', "<=", (int) '≥', ">=");

	final PDFont sans = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
	final PDFont bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
	final PDFont italic = new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE);
	final PDFont mono = new PDType1Font(Standard14Fonts.FontName.COURIER);
	final PDFont monoBold = new PDType1Font(Standard14Fonts.FontName.COURIER_BOLD);

	private final PDDocument document;
	private final Map<Character, Boolean> printable = new HashMap<>();
	private PDPageContentStream stream;
	private float cursor;

	PageFlow(PDDocument document) throws IOException {
		this.document = document;
		newPage();
	}

	/** A colour, as the stylesheet writes it: {@code Ink.hex(0x5b5fa8)}. */
	record Ink(float red, float green, float blue) {

		static Ink hex(int rgb) {
			return new Ink(((rgb >> 16) & 0xff) / 255f, ((rgb >> 8) & 0xff) / 255f, (rgb & 0xff) / 255f);
		}
	}

	/**
	 * How a run of text looks.
	 *
	 * @param leading  the height of one line of it
	 * @param tracking extra space after every character, for the spaced-out capitals of labels
	 */
	record Type(PDFont font, float size, Ink ink, float leading, float tracking) {

		Type(PDFont font, float size, Ink ink, float leading) {
			this(font, size, ink, leading, 0);
		}

		Type in(Ink other) {
			return new Type(font, size, other, leading, tracking);
		}
	}

	/** Draws something on a page once the number of pages is known: the footer. */
	@FunctionalInterface
	interface PageDecoration {
		void draw(PageFlow flow, int page, int pages) throws IOException;
	}

	// ------------------------------------------------------------------ the cursor ---

	float left() {
		return MARGIN;
	}

	float right() {
		return PAGE.getWidth() - MARGIN;
	}

	float width() {
		return right() - left();
	}

	/** The top of the next thing to be drawn. */
	float cursor() {
		return cursor;
	}

	void advance(float height) {
		cursor -= height;
	}

	/**
	 * Starts a new page unless {@code height} still fits above the footer. A page that has
	 * nothing on it yet is kept whatever the height, so something taller than a page cannot
	 * turn into an endless run of empty ones.
	 */
	void ensure(float height) throws IOException {
		if (cursor - height < BOTTOM && cursor < TOP) {
			newPage();
		}
	}

	/** Closes the last page, then draws {@code decoration} on every page with its number. */
	void finish(PageDecoration decoration) throws IOException {
		stream.close();
		int pages = document.getNumberOfPages();
		for (int page = 0; page < pages; page++) {
			try (PDPageContentStream over = new PDPageContentStream(
					document, document.getPage(page), PDPageContentStream.AppendMode.APPEND, true, true)) {
				stream = over;
				decoration.draw(this, page + 1, pages);
			}
		}
		stream = null;
	}

	private void newPage() throws IOException {
		if (stream != null) {
			stream.close();
		}
		PDPage page = new PDPage(PAGE);
		document.addPage(page);
		stream = new PDPageContentStream(document, page);
		cursor = TOP;
	}

	// ----------------------------------------------------------------------- text ---

	/** The baseline that sets this type in the middle of a line whose top is {@code top}. */
	static float baseline(float top, Type type) {
		return baseline(top, type.leading(), type.size());
	}

	/**
	 * The baseline that sets text of {@code size} in the middle of a band {@code height} tall:
	 * Helvetica's capitals reach 0.718 of the size above it and its descenders 0.207 below.
	 */
	static float baseline(float top, float height, float size) {
		return top - (height - 0.925f * size) / 2 - 0.718f * size;
	}

	/**
	 * The text as the standard fonts can print it: spacing of every kind becomes a plain space,
	 * an arrow or a comparison its ASCII spelling, anything else they lack a question mark.
	 *
	 * @param text never null: everything drawn is a filed report's own text or a label
	 */
	String clean(String text) {
		StringBuilder out = new StringBuilder(text.length());
		text.codePoints().forEach(point -> {
			if (Character.isWhitespace(point) || Character.isSpaceChar(point)) {
				out.append(' ');
			} else if (Character.isBmpCodePoint(point) && printable((char) point)) {
				out.append((char) point);
			} else {
				out.append(STAND_INS.getOrDefault(point, "?"));
			}
		});
		return out.toString();
	}

	private boolean printable(char c) {
		return printable.computeIfAbsent(c, this::encodes);
	}

	private boolean encodes(char c) {
		try {
			sans.encode(String.valueOf(c));
			return true;
		} catch (IllegalArgumentException | IOException _) {
			return false;
		}
	}

	float width(String text, Type type) throws IOException {
		String clean = clean(text);
		return type.font().getStringWidth(clean) / 1000 * type.size() + type.tracking() * clean.length();
	}

	/** One line of text, its baseline at {@code baseline}. */
	void text(String text, Type type, float x, float baseline) throws IOException {
		String clean = clean(text);
		if (clean.isEmpty()) {
			return;
		}
		stream.beginText();
		stream.setFont(type.font(), type.size());
		fill(type.ink());
		stream.setCharacterSpacing(type.tracking());
		stream.newLineAtOffset(x, baseline);
		stream.showText(clean);
		stream.endText();
	}

	/** One line of text ending at {@code right}. */
	void textRight(String text, Type type, float right, float baseline) throws IOException {
		text(text, type, right - width(text, type), baseline);
	}

	/**
	 * The text broken into lines no wider than {@code width}, at spaces where it can be and
	 * inside a word only when the word alone is too wide.
	 */
	List<String> wrap(String text, Type type, float width) throws IOException {
		List<String> lines = new ArrayList<>();
		StringBuilder line = new StringBuilder();
		for (String word : clean(text).split(" ")) {
			if (word.isEmpty()) {
				continue;
			}
			String longer = line.isEmpty() ? word : line + " " + word;
			if (width(longer, type) <= width) {
				line.setLength(0);
				line.append(longer);
			} else {
				if (!line.isEmpty()) {
					lines.add(line.toString());
					line.setLength(0);
				}
				line.append(breakWord(word, type, width, lines));
			}
		}
		if (!line.isEmpty()) {
			lines.add(line.toString());
		}
		return lines;
	}

	/** Adds whole lines of a word too wide for one, and returns the part left over to start the next line. */
	private String breakWord(String word, Type type, float width, List<String> lines) throws IOException {
		String rest = word;
		while (width(rest, type) > width) {
			int fits = fitting(rest, type, width);
			lines.add(rest.substring(0, fits));
			rest = rest.substring(fits);
		}
		return rest;
	}

	/** How many of the word's first characters fit in {@code width}; at least one. */
	private int fitting(String word, Type type, float width) throws IOException {
		int fits = 1;
		while (fits < word.length() && width(word.substring(0, fits + 1), type) <= width) {
			fits++;
		}
		return fits;
	}

	/** Lines of text from the cursor down, a page break allowed between any two of them. */
	void lines(List<String> lines, Type type, float x) throws IOException {
		for (String line : lines) {
			ensure(type.leading());
			text(line, type, x, baseline(cursor, type));
			advance(type.leading());
		}
	}

	/** Wrapped text from the cursor down; a long paragraph carries on over the page. */
	void paragraph(String text, Type type, float x, float width) throws IOException {
		lines(wrap(text, type, width), type, x);
	}

	// --------------------------------------------------------------------- shapes ---

	/** A rectangle hanging from {@code top}; either colour may be null for none, and with neither nothing is drawn. */
	void box(float x, float top, float width, float height, Ink fill, Ink stroke) throws IOException {
		if (fill == null && stroke == null) {
			return;
		}
		stream.addRect(x, top - height, width, height);
		if (fill == null) {
			stroke(stroke, 0.6f);
			stream.stroke();
		} else if (stroke == null) {
			fill(fill);
			stream.fill();
		} else {
			fill(fill);
			stroke(stroke, 0.6f);
			stream.fillAndStroke();
		}
	}

	void line(float x1, float y1, float x2, float y2, Ink ink, float weight) throws IOException {
		stroke(ink, weight);
		stream.moveTo(x1, y1);
		stream.lineTo(x2, y2);
		stream.stroke();
	}

	/** A horizontal rule across the text column at {@code y}. */
	void rule(float y, Ink ink, float weight) throws IOException {
		line(left(), y, right(), y, ink, weight);
	}

	/** A line through the points in order. */
	void polyline(float[] xs, float[] ys, Ink ink, float weight) throws IOException {
		stroke(ink, weight);
		stream.moveTo(xs[0], ys[0]);
		for (int i = 1; i < xs.length; i++) {
			stream.lineTo(xs[i], ys[i]);
		}
		stream.stroke();
	}

	/** A vertical bar with round ends, for a day's range in a chart. */
	void bar(float x, float y1, float y2, Ink ink, float weight) throws IOException {
		stream.setLineCapStyle(1);
		line(x, y1, x, y2, ink, weight);
		stream.setLineCapStyle(0);
	}

	void dot(float x, float y, float radius, Ink ink) throws IOException {
		float k = KAPPA * radius;
		fill(ink);
		stream.moveTo(x + radius, y);
		stream.curveTo(x + radius, y + k, x + k, y + radius, x, y + radius);
		stream.curveTo(x - k, y + radius, x - radius, y + k, x - radius, y);
		stream.curveTo(x - radius, y - k, x - k, y - radius, x, y - radius);
		stream.curveTo(x + k, y - radius, x + radius, y - k, x + radius, y);
		stream.fill();
	}

	/**
	 * A filled shape given as points on a grid whose y runs downwards, as an SVG path's does,
	 * placed with that grid's origin at {@code x}, {@code top} and scaled by {@code scale}.
	 */
	void shape(float[][] points, float x, float top, float scale, Ink ink) throws IOException {
		fill(ink);
		stream.moveTo(x + points[0][0] * scale, top - points[0][1] * scale);
		for (int i = 1; i < points.length; i++) {
			stream.lineTo(x + points[i][0] * scale, top - points[i][1] * scale);
		}
		stream.closePath();
		stream.fill();
	}

	private void fill(Ink ink) throws IOException {
		stream.setNonStrokingColor(ink.red(), ink.green(), ink.blue());
	}

	private void stroke(Ink ink, float weight) throws IOException {
		stream.setStrokingColor(ink.red(), ink.green(), ink.blue());
		stream.setLineWidth(weight);
	}
}

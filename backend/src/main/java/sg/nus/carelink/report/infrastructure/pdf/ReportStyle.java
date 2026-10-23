package sg.nus.carelink.report.infrastructure.pdf;

import sg.nus.carelink.report.infrastructure.pdf.PageFlow.Ink;
import sg.nus.carelink.report.infrastructure.pdf.PageFlow.Type;

/**
 * The manager console's look in points: its colours as {@code shared/theme/theme.css} defines
 * them, and its type scale as the report screens use it, with Helvetica for the console's sans
 * and Courier for its mono.
 */
final class ReportStyle {

	static final Ink INK = Ink.hex(0x111111);
	static final Ink SECONDARY = Ink.hex(0x444444);
	static final Ink TERTIARY = Ink.hex(0x555555);
	static final Ink MUTED = Ink.hex(0x6b6b6b);
	static final Ink FAINT = Ink.hex(0x9a9a9a);
	static final Ink BORDER = Ink.hex(0xe0e0e0);
	static final Ink BORDER_LIGHT = Ink.hex(0xededed);
	static final Ink SURFACE = Ink.hex(0xf8f8f6);
	static final Ink ACCENT = Ink.hex(0x5b5fa8);
	static final Ink DANGER = Ink.hex(0xc2503f);
	static final Ink DANGER_TINT = Ink.hex(0xfdf5f4);
	static final Ink SUCCESS = Ink.hex(0x3d7a63);
	static final Ink WARNING = Ink.hex(0xb08a2e);
	static final Ink WARNING_TEXT = Ink.hex(0x8c6c1f);
	static final Ink WARNING_TINT = Ink.hex(0xfbf7ec);

	final Type brand;
	final Type brandNote;
	final Type eyebrow;
	final Type title;
	final Type meta;
	final Type number;
	final Type heading;
	final Type headingAside;
	final Type body;
	final Type strong;
	final Type detail;
	final Type time;
	final Type note;
	final Type label;
	final Type figure;
	final Type figureOf;
	final Type figureText;
	final Type range;
	final Type pill;
	final Type step;
	final Type cite;
	final Type warning;
	final Type disclaimer;
	final Type footer;

	ReportStyle(PageFlow flow) {
		brand = new Type(flow.bold, 10.5f, INK, 14);
		brandNote = new Type(flow.sans, 8.5f, MUTED, 14);
		eyebrow = new Type(flow.mono, 7.5f, ACCENT, 11, 0.9f);
		title = new Type(flow.bold, 19, INK, 25);
		meta = new Type(flow.mono, 8, MUTED, 11.5f);
		number = new Type(flow.monoBold, 9, ACCENT, 16);
		heading = new Type(flow.bold, 12.5f, INK, 16);
		headingAside = new Type(flow.mono, 7.5f, MUTED, 16);
		body = new Type(flow.sans, 9.5f, INK, 13.5f);
		strong = new Type(flow.bold, 9.5f, INK, 13.5f);
		detail = new Type(flow.sans, 8.5f, TERTIARY, 11.5f);
		time = new Type(flow.mono, 7.8f, MUTED, 13.5f);
		note = new Type(flow.mono, 7.6f, MUTED, 11);
		// The screen's labels are a lighter grey; on paper that grey at this size fades out.
		label = new Type(flow.mono, 6.4f, MUTED, 9, 0.55f);
		figure = new Type(flow.bold, 17, INK, 20);
		figureOf = new Type(flow.sans, 8.5f, MUTED, 20);
		figureText = new Type(flow.monoBold, 8.5f, INK, 13.5f);
		range = new Type(flow.monoBold, 9.5f, INK, 12);
		pill = new Type(flow.mono, 6.8f, MUTED, 9, 0.25f);
		step = new Type(flow.mono, 7.4f, MUTED, 10.5f);
		cite = new Type(flow.mono, 7.4f, MUTED, 10.5f);
		warning = new Type(flow.bold, 9.5f, WARNING_TEXT, 13);
		disclaimer = new Type(flow.italic, 8.5f, SECONDARY, 12);
		footer = new Type(flow.mono, 6.8f, FAINT, 9);
	}

	/** A status's colour: the console's success, warning and danger, or muted for neither. */
	static Ink of(ReportLine.Tone tone) {
		return switch (tone) {
			case OK -> SUCCESS;
			case WARN -> WARNING_TEXT;
			case BAD -> DANGER;
			case NEUTRAL -> MUTED;
		};
	}
}

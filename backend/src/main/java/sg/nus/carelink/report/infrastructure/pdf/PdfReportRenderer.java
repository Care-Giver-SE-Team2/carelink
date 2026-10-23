package sg.nus.carelink.report.infrastructure.pdf;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.springframework.stereotype.Component;

import sg.nus.carelink.report.application.ReportPdfRenderer;
import sg.nus.carelink.report.domain.model.Report;
import sg.nus.carelink.report.domain.model.ReportContent;
import sg.nus.carelink.report.domain.model.ReportSection;
import sg.nus.carelink.report.infrastructure.pdf.PageFlow.Type;

/**
 * A filed report as an A4 PDF, laid out like the manager's report page: who it is for and what
 * period it covers, the gaps when the period was not complete, the sections numbered in the
 * order every reader's version shares, the notes appended since, and the family's disclaimer
 * when the version has one. Every page carries the report's number and its page count, so a
 * loose page still says what it belongs to.
 *
 * <p>Drawn with PDFBox, which the module already uses to read uploaded certificates; nothing new
 * is added to the build. The page frame is drawn here and the sections by
 * {@link SectionPainter}.
 */
@Component
class PdfReportRenderer implements ReportPdfRenderer {

	private static final String PRODUCT = "CareLink";
	private static final String CORRECTIONS = "Corrections and follow-ups";

	@Override
	public byte[] render(Report report, LocalDateTime exportedAt) throws IOException {
		try (PDDocument document = new PDDocument()) {
			describe(document, report);
			PageFlow flow = new PageFlow(document);
			ReportStyle style = new ReportStyle(flow);
			SectionPainter painter = new SectionPainter(flow, style);

			header(flow, style, report, exportedAt);
			gaps(flow, style, report.content());
			List<ReportSection> sections = report.content().sections();
			for (int i = 0; i < sections.size(); i++) {
				ReportSection section = sections.get(i);
				heading(flow, style, i + 1, section.title(), null, painter.opening(section));
				painter.paint(section);
			}
			heading(flow, style, sections.size() + 1, CORRECTIONS, "appended, never edited", painter.notesOpening());
			painter.notes(report.amendments());
			disclaimer(flow, style, report.content().disclaimer());
			end(flow, style, report);
			flow.finish((page, number, pages) -> footer(page, style, report, number, pages));

			ByteArrayOutputStream out = new ByteArrayOutputStream();
			document.save(out);
			return out.toByteArray();
		}
	}

	/** "Internal report — Elder #1", as the report page heads it. */
	private static String title(Report report) {
		return ReportText.audience(report.audience()) + " report — Elder #" + report.elderId();
	}

	private static void describe(PDDocument document, Report report) {
		PDDocumentInformation information = document.getDocumentInformation();
		information.setTitle("RPT-" + report.id() + " " + title(report) + ", " + ReportText.period(report.period()));
		information.setSubject("Periodic care report");
		information.setCreator(PRODUCT);
	}

	private static void header(PageFlow flow, ReportStyle style, Report report, LocalDateTime exportedAt)
			throws IOException {
		float baseline = PageFlow.baseline(flow.cursor(), style.brand);
		flow.text(PRODUCT, style.brand, flow.left(), baseline);
		flow.text("Periodic care report", style.brandNote, flow.left() + flow.width(PRODUCT, style.brand) + 8, baseline);
		flow.textRight("Exported " + ReportText.moment(exportedAt), style.footer, flow.right(), baseline);
		flow.advance(style.brand.leading() + 3);
		flow.rule(flow.cursor(), ReportStyle.INK, 1.1f);
		flow.advance(16);

		line(flow, ReportText.upper(ReportText.audience(report.audience()) + " version") + " · RPT-" + report.id(),
				style.eyebrow);
		flow.advance(2);
		line(flow, title(report), style.title);
		line(flow, ReportText.period(report.period()) + " · " + ReportText.generatedBy(report.content().generatedBy()),
				style.meta);
		line(flow, ReportText.status(report.status()) + " · filed " + ReportText.moment(report.createdAt()), style.meta);
		line(flow, ReportText.audienceNote(report.audience()), style.meta);
		flow.advance(10);
	}

	private static void line(PageFlow flow, String text, Type type) throws IOException {
		flow.paragraph(text, type, flow.left(), flow.width());
	}

	/** "Data incomplete" and the visits that were not closed, before any section, never implied. */
	private static void gaps(PageFlow flow, ReportStyle style, ReportContent content) throws IOException {
		if (content.dataComplete()) {
			return;
		}
		Type item = style.note.in(ReportStyle.INK);
		float inner = flow.left() + 14;
		List<List<String>> items = new ArrayList<>();
		for (String missing : content.missingItems()) {
			items.add(flow.wrap(missing, item, flow.right() - 14 - inner - 10));
		}
		int lines = items.stream().mapToInt(List::size).sum();
		float height = 9 + style.gapHeading.leading() + lines * item.leading() + 8;
		flow.ensure(height);
		float top = flow.cursor();
		flow.box(flow.left(), top, flow.width(), height, ReportStyle.WARNING_TINT, ReportStyle.WARNING);
		flow.box(flow.left(), top, 3, height, ReportStyle.WARNING, null);
		flow.advance(9);
		flow.text("Data incomplete", style.gapHeading, inner, PageFlow.baseline(flow.cursor(), style.gapHeading));
		flow.advance(style.gapHeading.leading());
		for (List<String> missing : items) {
			for (int i = 0; i < missing.size(); i++) {
				float baseline = PageFlow.baseline(flow.cursor(), item);
				if (i == 0) {
					flow.text("•", item, inner, baseline);
				}
				flow.text(missing.get(i), item, inner + 10, baseline);
				flow.advance(item.leading());
			}
		}
		// The box's own padding, then the space before the first heading.
		flow.advance(8f + 6f);
	}

	/**
	 * A numbered section heading under a rule, kept on the page with the first {@code opening}
	 * points of what follows it.
	 */
	private static void heading(PageFlow flow, ReportStyle style, int number, String title, String aside,
			float opening) throws IOException {
		flow.ensure(14 + 8 + style.heading.leading() + 6 + opening);
		flow.advance(14);
		flow.rule(flow.cursor(), ReportStyle.BORDER, 0.6f);
		flow.advance(8);
		float baseline = PageFlow.baseline(flow.cursor(), style.heading);
		flow.text("%02d".formatted(number), style.number, flow.left(), baseline);
		float x = flow.left() + 24;
		flow.text(title, style.heading, x, baseline);
		if (aside != null) {
			flow.text(aside, style.headingAside, x + flow.width(title, style.heading) + 10, baseline);
		}
		flow.advance(style.heading.leading() + 6);
	}

	/** The family's fixed medical disclaimer, under everything else; other versions have none. */
	private static void disclaimer(PageFlow flow, ReportStyle style, String disclaimer) throws IOException {
		if (disclaimer == null || disclaimer.isBlank()) {
			return;
		}
		flow.ensure(10 + 7 + 2 * style.disclaimer.leading());
		flow.advance(10);
		flow.rule(flow.cursor(), ReportStyle.BORDER, 0.6f);
		flow.advance(7);
		flow.paragraph(disclaimer, style.disclaimer, flow.left(), flow.width());
	}

	private static void end(PageFlow flow, ReportStyle style, Report report) throws IOException {
		flow.ensure(16 + style.footer.leading());
		flow.advance(16);
		String text = "End of report RPT-" + report.id();
		flow.text(text, style.footer, flow.left() + (flow.width() - flow.width(text, style.footer)) / 2,
				PageFlow.baseline(flow.cursor(), style.footer));
	}

	private static void footer(PageFlow flow, ReportStyle style, Report report, int page, int pages)
			throws IOException {
		float baseline = PageFlow.BOTTOM - 22;
		flow.rule(baseline + 10, ReportStyle.BORDER, 0.5f);
		flow.text("RPT-" + report.id() + " · " + title(report) + " · " + ReportText.period(report.period()),
				style.footer, flow.left(), baseline);
		flow.textRight("Page " + page + " of " + pages, style.footer, flow.right(), baseline);
	}
}

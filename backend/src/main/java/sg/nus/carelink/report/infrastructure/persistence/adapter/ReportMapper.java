package sg.nus.carelink.report.infrastructure.persistence.adapter;

import sg.nus.carelink.report.domain.model.Report;
import sg.nus.carelink.report.infrastructure.persistence.entity.ReportJpaEntity;

/**
 * JPA entity <-> domain model for report, both directions, column by column. Database-managed
 * columns (created_at, updated_at) are read but never written back. Covered by ReportMapperTest.
 */
final class ReportMapper {

	private ReportMapper() {
	}

	static Report toDomain(ReportJpaEntity e) {
		return new Report(
				e.getId(),
				e.getElderId(),
				e.getGeneratedByUserId(),
				e.getAudience() == null ? null : Report.Audience.valueOf(e.getAudience().name()),
				e.getPeriodStart(),
				e.getPeriodEnd(),
				e.getStatus() == null ? null : Report.Status.valueOf(e.getStatus().name()),
				e.getContent(),
				e.getCreatedAt());
	}

	static ReportJpaEntity toEntity(Report d) {
		ReportJpaEntity e = new ReportJpaEntity();
		e.setId(d.id());
		e.setElderId(d.elderId());
		e.setGeneratedByUserId(d.generatedByUserId());
		e.setAudience(d.audience() == null ? null : ReportJpaEntity.Audience.valueOf(d.audience().name()));
		e.setPeriodStart(d.periodStart());
		e.setPeriodEnd(d.periodEnd());
		e.setStatus(d.status() == null ? null : ReportJpaEntity.Status.valueOf(d.status().name()));
		e.setContent(d.content());
		return e;
	}
}

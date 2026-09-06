package sg.nus.carelink.report.infrastructure.persistence.adapter;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.report.domain.model.Report;
import sg.nus.carelink.report.infrastructure.persistence.entity.ReportJpaEntity;

/** Every column survives the trip entity -> domain -> entity; a swapped or dropped field fails here. */
class ReportMapperTest {

	@Test
	void mapsEveryColumnInBothDirections() {
		ReportJpaEntity entity = new ReportJpaEntity();
		entity.setId(1L);
		entity.setElderId(2L);
		entity.setGeneratedByUserId(3L);
		entity.setAudience(ReportJpaEntity.Audience.FAMILY);
		entity.setPeriodStart(LocalDate.of(2026, 9, 6));
		entity.setPeriodEnd(LocalDate.of(2026, 9, 7));
		entity.setStatus(ReportJpaEntity.Status.DRAFT);
		entity.setContent("v8");

		Report domain = ReportMapper.toDomain(entity);
		assertThat(domain.id()).isEqualTo(entity.getId());
		assertThat(domain.elderId()).isEqualTo(entity.getElderId());
		assertThat(domain.generatedByUserId()).isEqualTo(entity.getGeneratedByUserId());
		assertThat(domain.audience().name()).isEqualTo(entity.getAudience().name());
		assertThat(domain.periodStart()).isEqualTo(entity.getPeriodStart());
		assertThat(domain.periodEnd()).isEqualTo(entity.getPeriodEnd());
		assertThat(domain.status().name()).isEqualTo(entity.getStatus().name());
		assertThat(domain.content()).isEqualTo(entity.getContent());

		ReportJpaEntity back = ReportMapper.toEntity(domain);
		assertThat(back.getId()).isEqualTo(entity.getId());
		assertThat(back.getElderId()).isEqualTo(entity.getElderId());
		assertThat(back.getGeneratedByUserId()).isEqualTo(entity.getGeneratedByUserId());
		assertThat(back.getAudience()).isEqualTo(entity.getAudience());
		assertThat(back.getPeriodStart()).isEqualTo(entity.getPeriodStart());
		assertThat(back.getPeriodEnd()).isEqualTo(entity.getPeriodEnd());
		assertThat(back.getStatus()).isEqualTo(entity.getStatus());
		assertThat(back.getContent()).isEqualTo(entity.getContent());
	}
}

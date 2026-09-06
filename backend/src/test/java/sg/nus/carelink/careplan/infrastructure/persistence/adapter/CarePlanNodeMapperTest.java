package sg.nus.carelink.careplan.infrastructure.persistence.adapter;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.careplan.domain.model.CarePlanNode;
import sg.nus.carelink.careplan.infrastructure.persistence.entity.CarePlanNodeJpaEntity;

/** Every column survives the trip entity -> domain -> entity; a swapped or dropped field fails here. */
class CarePlanNodeMapperTest {

	@Test
	void mapsEveryColumnInBothDirections() {
		CarePlanNodeJpaEntity entity = new CarePlanNodeJpaEntity();
		entity.setId(1L);
		entity.setCarePlanId(2L);
		entity.setParentId(3L);
		entity.setNodeType(CarePlanNodeJpaEntity.NodeType.SUB_PLAN);
		entity.setName("v5");
		entity.setServiceType("v6");
		entity.setScheduleDays("v7");
		entity.setDurationPerVisit(new BigDecimal("8.5"));
		entity.setWeeklyHours(new BigDecimal("9.5"));
		entity.setEvidenceType(CarePlanNodeJpaEntity.EvidenceType.NONE);
		entity.setDisplayOrder(11);

		CarePlanNode domain = CarePlanNodeMapper.toDomain(entity);
		assertThat(domain.id()).isEqualTo(entity.getId());
		assertThat(domain.carePlanId()).isEqualTo(entity.getCarePlanId());
		assertThat(domain.parentId()).isEqualTo(entity.getParentId());
		assertThat(domain.nodeType().name()).isEqualTo(entity.getNodeType().name());
		assertThat(domain.name()).isEqualTo(entity.getName());
		assertThat(domain.serviceType()).isEqualTo(entity.getServiceType());
		assertThat(domain.scheduleDays()).isEqualTo(entity.getScheduleDays());
		assertThat(domain.durationPerVisit()).isEqualTo(entity.getDurationPerVisit());
		assertThat(domain.weeklyHours()).isEqualTo(entity.getWeeklyHours());
		assertThat(domain.evidenceType().name()).isEqualTo(entity.getEvidenceType().name());
		assertThat(domain.displayOrder()).isEqualTo(entity.getDisplayOrder());

		CarePlanNodeJpaEntity back = CarePlanNodeMapper.toEntity(domain);
		assertThat(back.getId()).isEqualTo(entity.getId());
		assertThat(back.getCarePlanId()).isEqualTo(entity.getCarePlanId());
		assertThat(back.getParentId()).isEqualTo(entity.getParentId());
		assertThat(back.getNodeType()).isEqualTo(entity.getNodeType());
		assertThat(back.getName()).isEqualTo(entity.getName());
		assertThat(back.getServiceType()).isEqualTo(entity.getServiceType());
		assertThat(back.getScheduleDays()).isEqualTo(entity.getScheduleDays());
		assertThat(back.getDurationPerVisit()).isEqualTo(entity.getDurationPerVisit());
		assertThat(back.getWeeklyHours()).isEqualTo(entity.getWeeklyHours());
		assertThat(back.getEvidenceType()).isEqualTo(entity.getEvidenceType());
		assertThat(back.getDisplayOrder()).isEqualTo(entity.getDisplayOrder());
	}
}

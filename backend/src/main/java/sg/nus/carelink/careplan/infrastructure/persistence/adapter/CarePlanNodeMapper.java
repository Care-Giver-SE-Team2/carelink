package sg.nus.carelink.careplan.infrastructure.persistence.adapter;

import sg.nus.carelink.careplan.domain.model.CarePlanNode;
import sg.nus.carelink.careplan.infrastructure.persistence.entity.CarePlanNodeJpaEntity;

/**
 * JPA entity <-> domain model for care_plan_node, both directions, column by column. Database-managed
 * columns (created_at, updated_at) are read but never written back. Covered by CarePlanNodeMapperTest.
 */
final class CarePlanNodeMapper {

	private CarePlanNodeMapper() {
	}

	static CarePlanNode toDomain(CarePlanNodeJpaEntity e) {
		return new CarePlanNode(
				e.getId(),
				e.getCarePlanId(),
				e.getParentId(),
				e.getNodeType() == null ? null : CarePlanNode.NodeType.valueOf(e.getNodeType().name()),
				e.getName(),
				e.getServiceType(),
				e.getScheduleDays(),
				e.getDurationPerVisit(),
				e.getWeeklyHours(),
				e.getEvidenceType() == null ? null : CarePlanNode.EvidenceType.valueOf(e.getEvidenceType().name()),
				e.getDisplayOrder(),
				e.getCreatedAt(),
				e.getUpdatedAt());
	}

	static CarePlanNodeJpaEntity toEntity(CarePlanNode d) {
		CarePlanNodeJpaEntity e = new CarePlanNodeJpaEntity();
		e.setId(d.id());
		e.setCarePlanId(d.carePlanId());
		e.setParentId(d.parentId());
		e.setNodeType(d.nodeType() == null ? null : CarePlanNodeJpaEntity.NodeType.valueOf(d.nodeType().name()));
		e.setName(d.name());
		e.setServiceType(d.serviceType());
		e.setScheduleDays(d.scheduleDays());
		e.setDurationPerVisit(d.durationPerVisit());
		e.setWeeklyHours(d.weeklyHours());
		e.setEvidenceType(d.evidenceType() == null ? null : CarePlanNodeJpaEntity.EvidenceType.valueOf(d.evidenceType().name()));
		e.setDisplayOrder(d.displayOrder());
		return e;
	}
}

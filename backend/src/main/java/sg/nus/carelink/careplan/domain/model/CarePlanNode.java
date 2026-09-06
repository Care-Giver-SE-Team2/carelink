package sg.nus.carelink.careplan.domain.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Domain model for care_plan_node.
 *
 * <p>Generated starting point: the same fields as the table, and nothing else. This is
 * where the business rules and the design patterns go — reshape it into a proper
 * aggregate (add behaviour, fold child tables in, drop columns the domain does not
 * care about). identity.domain.model.AppUser is the template. Must not import JPA or
 * Spring Data; ArchUnit rejects the build if it does.
 */
public record CarePlanNode(
		Long id,
		Long carePlanId,
		Long parentId,
		CarePlanNode.NodeType nodeType,
		String name,
		String serviceType,
		String scheduleDays,
		BigDecimal durationPerVisit,
		BigDecimal weeklyHours,
		CarePlanNode.EvidenceType evidenceType,
		Integer displayOrder,
		LocalDateTime createdAt,
		LocalDateTime updatedAt) {

	public enum NodeType {
		SUB_PLAN, TASK
	}

	public enum EvidenceType {
		NONE, CHECKLIST, PHOTO, READING
	}
}

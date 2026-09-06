package sg.nus.carelink.careplan.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * JPA entity for table care_plan_node.
 *
 * This IS in a submission after all: the supervisor's screen-2a ERD has PLAN_NODE,
 * "a self-referencing tree (sub-plans nest to any depth)". It was dropped when the
 * twelve-table SQL was consolidated, and it is the table the Composite design
 * problem is built on. The columns below are his, renamed to the conventions above.
 *
 * DECISION 8  The plan is a tree, not one flat row. Story A3 requires hours to
 *             roll up "from a task item to the overall plan" across an
 *             indeterminate number of levels, which is the whole reason
 *             Composite was chosen. parent_id null means the node sits directly
 *             under the plan. Screen 2a: "a sub-plan can hold tasks or further
 *             sub-plans to any depth; effort at every level is the sum of its
 *             children".
 *
 * <p>Generated from V2__care_domain.sql as a starting point; edit freely, it will not
 * be regenerated. Mirrors identity's AppUserJpaEntity: package-private, no domain
 * logic, references to other aggregates are plain ids (DECISION 5 in the schema),
 * so no module depends on another module's persistence classes.
 *
 * <p>The schema is owned by Flyway. Hibernate validates this mapping at start-up
 * and never alters the table.
 */
@Entity
@Table(name = "care_plan_node")
class CarePlanNodeJpaEntity {

	enum NodeType {
		SUB_PLAN, TASK
	}

	enum EvidenceType {
		NONE, CHECKLIST, PHOTO, READING
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "care_plan_id", nullable = false)
	private Long carePlanId;

	/** self reference; null at the top level */
	@Column(name = "parent_id")
	private Long parentId;

	@Enumerated(EnumType.STRING)
	@Column(name = "node_type", nullable = false)
	private NodeType nodeType;

	@Column(name = "name", nullable = false, length = 150)
	private String name;

	/** bathing, medication reminder, rehabilitation … */
	@Column(name = "service_type", length = 50)
	private String serviceType;

	/** e.g. MON,WED,FRI or DAILY */
	@Column(name = "schedule_days", length = 30)
	private String scheduleDays;

	/** hours; TASK nodes only */
	@Column(name = "duration_per_visit", precision = 5, scale = 2)
	private BigDecimal durationPerVisit;

	/** TASK: computed; SUB_PLAN: sum of children */
	@Column(name = "weekly_hours", precision = 6, scale = 2)
	private BigDecimal weeklyHours;

	/** what the caregiver must capture to close the task */
	@Enumerated(EnumType.STRING)
	@Column(name = "evidence_type", nullable = false)
	private EvidenceType evidenceType = EvidenceType.NONE;

	@Column(name = "display_order", nullable = false)
	private Integer displayOrder = 0;

	@Column(name = "created_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime updatedAt;

	protected CarePlanNodeJpaEntity() {
	}

	Long getId() {
		return id;
	}

	Long getCarePlanId() {
		return carePlanId;
	}

	void setCarePlanId(Long carePlanId) {
		this.carePlanId = carePlanId;
	}

	Long getParentId() {
		return parentId;
	}

	void setParentId(Long parentId) {
		this.parentId = parentId;
	}

	NodeType getNodeType() {
		return nodeType;
	}

	void setNodeType(NodeType nodeType) {
		this.nodeType = nodeType;
	}

	String getName() {
		return name;
	}

	void setName(String name) {
		this.name = name;
	}

	String getServiceType() {
		return serviceType;
	}

	void setServiceType(String serviceType) {
		this.serviceType = serviceType;
	}

	String getScheduleDays() {
		return scheduleDays;
	}

	void setScheduleDays(String scheduleDays) {
		this.scheduleDays = scheduleDays;
	}

	BigDecimal getDurationPerVisit() {
		return durationPerVisit;
	}

	void setDurationPerVisit(BigDecimal durationPerVisit) {
		this.durationPerVisit = durationPerVisit;
	}

	BigDecimal getWeeklyHours() {
		return weeklyHours;
	}

	void setWeeklyHours(BigDecimal weeklyHours) {
		this.weeklyHours = weeklyHours;
	}

	EvidenceType getEvidenceType() {
		return evidenceType;
	}

	void setEvidenceType(EvidenceType evidenceType) {
		this.evidenceType = evidenceType;
	}

	Integer getDisplayOrder() {
		return displayOrder;
	}

	void setDisplayOrder(Integer displayOrder) {
		this.displayOrder = displayOrder;
	}

	LocalDateTime getCreatedAt() {
		return createdAt;
	}

	LocalDateTime getUpdatedAt() {
		return updatedAt;
	}
}

package sg.nus.carelink.visit.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * JPA entity for table visit_task.
 *
 * From the caregiver analysis (VisitTaskExecution). The caregiver ticks tasks off
 * during the visit; each row is one care_plan_node of type TASK as executed on
 * this visit. UC-CG03, UC-CG05.
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
@Table(name = "visit_task")
class VisitTaskJpaEntity {

	enum Status {
		PENDING, DONE, SKIPPED, REFUSED
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "visit_id", nullable = false)
	private Long visitId;

	/** soft FK to care_plan_node.id; the TASK this executes */
	@Column(name = "care_plan_node_id")
	private Long carePlanNodeId;

	@Column(name = "name", nullable = false, length = 150)
	private String name;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false)
	private Status status = Status.PENDING;

	@Column(name = "outcome", length = 255)
	private String outcome;

	@Column(name = "caregiver_note", length = 500)
	private String caregiverNote;

	@Column(name = "completed_at")
	private LocalDateTime completedAt;

	protected VisitTaskJpaEntity() {
	}

	Long getId() {
		return id;
	}

	Long getVisitId() {
		return visitId;
	}

	void setVisitId(Long visitId) {
		this.visitId = visitId;
	}

	Long getCarePlanNodeId() {
		return carePlanNodeId;
	}

	void setCarePlanNodeId(Long carePlanNodeId) {
		this.carePlanNodeId = carePlanNodeId;
	}

	String getName() {
		return name;
	}

	void setName(String name) {
		this.name = name;
	}

	Status getStatus() {
		return status;
	}

	void setStatus(Status status) {
		this.status = status;
	}

	String getOutcome() {
		return outcome;
	}

	void setOutcome(String outcome) {
		this.outcome = outcome;
	}

	String getCaregiverNote() {
		return caregiverNote;
	}

	void setCaregiverNote(String caregiverNote) {
		this.caregiverNote = caregiverNote;
	}

	LocalDateTime getCompletedAt() {
		return completedAt;
	}

	void setCompletedAt(LocalDateTime completedAt) {
		this.completedAt = completedAt;
	}
}

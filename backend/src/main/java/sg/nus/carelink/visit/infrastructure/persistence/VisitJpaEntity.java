package sg.nus.carelink.visit.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.LocalDateTime;

/**
 * JPA entity for table visit.
 *
 * Merges manager.visit + elder.service_order.
 *
 * DECISION 9  These were the same thing under two names. manager.visit is a
 *             scheduled home visit; elder.service_order is a service with a
 *             caregiver, a time window and a completion confirmation. Keeping
 *             both would mean the caregiver closing a visit while the elder
 *             confirms an order, with nothing joining them.
 *
 *             The merged status list is elder's, which is the one the State
 *             design problem is built on, plus manager's EXCEPTION outcome.
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
@Table(name = "visit")
class VisitJpaEntity {

	enum Status {
		SCHEDULED, ARRIVED, IN_PROGRESS, COMPLETED, VERIFIED, AUTO_CLOSED, EXCEPTION, CANCELLED
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "elder_id", nullable = false)
	private Long elderId;

	/** null while unassigned */
	@Column(name = "caregiver_id")
	private Long caregiverId;

	/** soft FK to care_plan_node.id; which plan task this fulfils */
	@Column(name = "care_plan_node_id")
	private Long carePlanNodeId;

	/** set when this visit was re-rostered because of an absence */
	@Column(name = "absence_id")
	private Long absenceId;

	@Column(name = "service_type", length = 50)
	private String serviceType;

	@Column(name = "scheduled_start", nullable = false)
	private LocalDateTime scheduledStart;

	@Column(name = "scheduled_end")
	private LocalDateTime scheduledEnd;

	@Column(name = "checked_in_at")
	private LocalDateTime checkedInAt;

	@Column(name = "checked_out_at")
	private LocalDateTime checkedOutAt;

	/** COMPLETED = checked out, awaiting the elder; VERIFIED = elder confirmed and supervisor verified; AUTO_CLOSED = the elder never answered (DECISION 16) */
	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false)
	private Status status = Status.SCHEDULED;

	/** when the current state must have advanced by; SYS03 infers a missed check-in from it */
	@Column(name = "state_deadline")
	private LocalDateTime stateDeadline;

	/** soft FK to care_plan.id: the plan VERSION in force when this visit was created (story A6). Superseded versions are never edited, so pointing at the row is the snapshot */
	@Column(name = "care_plan_id")
	private Long carePlanId;

	/** optimistic lock for concurrent state changes */
	@Version
	@Column(name = "version", nullable = false)
	private Integer version;

	@Column(name = "created_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime updatedAt;

	protected VisitJpaEntity() {
	}

	Long getId() {
		return id;
	}

	Long getElderId() {
		return elderId;
	}

	void setElderId(Long elderId) {
		this.elderId = elderId;
	}

	Long getCaregiverId() {
		return caregiverId;
	}

	void setCaregiverId(Long caregiverId) {
		this.caregiverId = caregiverId;
	}

	Long getCarePlanNodeId() {
		return carePlanNodeId;
	}

	void setCarePlanNodeId(Long carePlanNodeId) {
		this.carePlanNodeId = carePlanNodeId;
	}

	Long getAbsenceId() {
		return absenceId;
	}

	void setAbsenceId(Long absenceId) {
		this.absenceId = absenceId;
	}

	String getServiceType() {
		return serviceType;
	}

	void setServiceType(String serviceType) {
		this.serviceType = serviceType;
	}

	LocalDateTime getScheduledStart() {
		return scheduledStart;
	}

	void setScheduledStart(LocalDateTime scheduledStart) {
		this.scheduledStart = scheduledStart;
	}

	LocalDateTime getScheduledEnd() {
		return scheduledEnd;
	}

	void setScheduledEnd(LocalDateTime scheduledEnd) {
		this.scheduledEnd = scheduledEnd;
	}

	LocalDateTime getCheckedInAt() {
		return checkedInAt;
	}

	void setCheckedInAt(LocalDateTime checkedInAt) {
		this.checkedInAt = checkedInAt;
	}

	LocalDateTime getCheckedOutAt() {
		return checkedOutAt;
	}

	void setCheckedOutAt(LocalDateTime checkedOutAt) {
		this.checkedOutAt = checkedOutAt;
	}

	Status getStatus() {
		return status;
	}

	void setStatus(Status status) {
		this.status = status;
	}

	LocalDateTime getStateDeadline() {
		return stateDeadline;
	}

	void setStateDeadline(LocalDateTime stateDeadline) {
		this.stateDeadline = stateDeadline;
	}

	Long getCarePlanId() {
		return carePlanId;
	}

	void setCarePlanId(Long carePlanId) {
		this.carePlanId = carePlanId;
	}

	Integer getVersion() {
		return version;
	}

	LocalDateTime getCreatedAt() {
		return createdAt;
	}

	LocalDateTime getUpdatedAt() {
		return updatedAt;
	}
}

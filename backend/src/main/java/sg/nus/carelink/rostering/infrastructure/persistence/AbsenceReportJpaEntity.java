package sg.nus.carelink.rostering.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * JPA entity for table absence_report.
 *
 * From manager.absence_report. CG02 writes it, MG04 reads it.
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
@Table(name = "absence_report")
class AbsenceReportJpaEntity {

	enum Type {
		SICK, ANNUAL, EMERGENCY, OTHER
	}

	enum Status {
		PENDING, APPROVED, REJECTED
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "caregiver_id", nullable = false)
	private Long caregiverId;

	/** soft FK to app_user.id */
	@Column(name = "reviewed_by_user_id")
	private Long reviewedByUserId;

	@Enumerated(EnumType.STRING)
	@Column(name = "type", nullable = false)
	private Type type = Type.OTHER;

	@Column(name = "start_date", nullable = false)
	private LocalDate startDate;

	@Column(name = "end_date", nullable = false)
	private LocalDate endDate;

	@Column(name = "reason", length = 255)
	private String reason;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false)
	private Status status = Status.PENDING;

	@Column(name = "created_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime updatedAt;

	protected AbsenceReportJpaEntity() {
	}

	Long getId() {
		return id;
	}

	Long getCaregiverId() {
		return caregiverId;
	}

	void setCaregiverId(Long caregiverId) {
		this.caregiverId = caregiverId;
	}

	Long getReviewedByUserId() {
		return reviewedByUserId;
	}

	void setReviewedByUserId(Long reviewedByUserId) {
		this.reviewedByUserId = reviewedByUserId;
	}

	Type getType() {
		return type;
	}

	void setType(Type type) {
		this.type = type;
	}

	LocalDate getStartDate() {
		return startDate;
	}

	void setStartDate(LocalDate startDate) {
		this.startDate = startDate;
	}

	LocalDate getEndDate() {
		return endDate;
	}

	void setEndDate(LocalDate endDate) {
		this.endDate = endDate;
	}

	String getReason() {
		return reason;
	}

	void setReason(String reason) {
		this.reason = reason;
	}

	Status getStatus() {
		return status;
	}

	void setStatus(Status status) {
		this.status = status;
	}

	LocalDateTime getCreatedAt() {
		return createdAt;
	}

	LocalDateTime getUpdatedAt() {
		return updatedAt;
	}
}

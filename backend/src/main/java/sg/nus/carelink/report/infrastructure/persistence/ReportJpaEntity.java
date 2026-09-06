package sg.nus.carelink.report.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * JPA entity for table report.
 *
 * From manager.report. `audience` is what the redaction design problem
 * switches on, and the scope actually applied comes from
 * elder_family_binding.access_scope at generation time.
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
@Table(name = "report")
class ReportJpaEntity {

	enum Audience {
		FAMILY, REGULATOR, INTERNAL
	}

	enum Status {
		DRAFT, PUBLISHED, ARCHIVED
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "elder_id", nullable = false)
	private Long elderId;

	/** soft FK to app_user.id */
	@Column(name = "generated_by_user_id")
	private Long generatedByUserId;

	@Enumerated(EnumType.STRING)
	@Column(name = "audience", nullable = false)
	private Audience audience;

	@Column(name = "period_start", nullable = false)
	private LocalDate periodStart;

	@Column(name = "period_end", nullable = false)
	private LocalDate periodEnd;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false)
	private Status status = Status.DRAFT;

	/** rendered sections, already filtered for the audience */
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "content")
	private String content;

	@Column(name = "created_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime createdAt;

	protected ReportJpaEntity() {
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

	Long getGeneratedByUserId() {
		return generatedByUserId;
	}

	void setGeneratedByUserId(Long generatedByUserId) {
		this.generatedByUserId = generatedByUserId;
	}

	Audience getAudience() {
		return audience;
	}

	void setAudience(Audience audience) {
		this.audience = audience;
	}

	LocalDate getPeriodStart() {
		return periodStart;
	}

	void setPeriodStart(LocalDate periodStart) {
		this.periodStart = periodStart;
	}

	LocalDate getPeriodEnd() {
		return periodEnd;
	}

	void setPeriodEnd(LocalDate periodEnd) {
		this.periodEnd = periodEnd;
	}

	Status getStatus() {
		return status;
	}

	void setStatus(Status status) {
		this.status = status;
	}

	String getContent() {
		return content;
	}

	void setContent(String content) {
		this.content = content;
	}

	LocalDateTime getCreatedAt() {
		return createdAt;
	}
}

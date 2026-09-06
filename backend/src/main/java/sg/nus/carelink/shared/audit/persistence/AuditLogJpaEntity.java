package sg.nus.carelink.shared.audit.persistence;

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
 * JPA entity for table audit_log.
 *
 * From the caregiver analysis (AuditLog), and promised in the proposal as the
 * non-functional requirement "we can always answer who knew what, and when".
 * Append-only: rows are never updated or deleted. Owned by the platform layer.
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
@Table(name = "audit_log")
class AuditLogJpaEntity {

	enum Result {
		OK, DENIED, FAILED
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** soft FK to app_user.id; null for scheduled jobs */
	@Column(name = "actor_user_id")
	private Long actorUserId;

	/** READ, CREATE, UPDATE, STATE_CHANGE, EXPORT … */
	@Column(name = "action", nullable = false, length = 50)
	private String action;

	/** table or aggregate name */
	@Column(name = "resource_type", nullable = false, length = 50)
	private String resourceType;

	@Column(name = "resource_id")
	private Long resourceId;

	@Enumerated(EnumType.STRING)
	@Column(name = "result", nullable = false)
	private Result result = Result.OK;

	@Column(name = "detail", length = 500)
	private String detail;

	@Column(name = "occurred_at", nullable = false)
	private LocalDateTime occurredAt;

	protected AuditLogJpaEntity() {
	}

	Long getId() {
		return id;
	}

	Long getActorUserId() {
		return actorUserId;
	}

	void setActorUserId(Long actorUserId) {
		this.actorUserId = actorUserId;
	}

	String getAction() {
		return action;
	}

	void setAction(String action) {
		this.action = action;
	}

	String getResourceType() {
		return resourceType;
	}

	void setResourceType(String resourceType) {
		this.resourceType = resourceType;
	}

	Long getResourceId() {
		return resourceId;
	}

	void setResourceId(Long resourceId) {
		this.resourceId = resourceId;
	}

	Result getResult() {
		return result;
	}

	void setResult(Result result) {
		this.result = result;
	}

	String getDetail() {
		return detail;
	}

	void setDetail(String detail) {
		this.detail = detail;
	}

	LocalDateTime getOccurredAt() {
		return occurredAt;
	}

	void setOccurredAt(LocalDateTime occurredAt) {
		this.occurredAt = occurredAt;
	}
}

package sg.nus.carelink.incident.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * JPA entity for table incident_log.
 *
 * From manager.incident_log. Story D8 requires every notification and every
 * timeout to be an immutable record, so nothing here is ever updated.
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
@Table(name = "incident_log")
class IncidentLogJpaEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "incident_id", nullable = false)
	private Long incidentId;

	@Column(name = "actor", nullable = false, length = 150)
	private String actor;

	@Column(name = "action", nullable = false, length = 255)
	private String action;

	@Column(name = "detail", length = 500)
	private String detail;

	@Column(name = "occurred_at", nullable = false)
	private LocalDateTime occurredAt;

	protected IncidentLogJpaEntity() {
	}

	Long getId() {
		return id;
	}

	Long getIncidentId() {
		return incidentId;
	}

	void setIncidentId(Long incidentId) {
		this.incidentId = incidentId;
	}

	String getActor() {
		return actor;
	}

	void setActor(String actor) {
		this.actor = actor;
	}

	String getAction() {
		return action;
	}

	void setAction(String action) {
		this.action = action;
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

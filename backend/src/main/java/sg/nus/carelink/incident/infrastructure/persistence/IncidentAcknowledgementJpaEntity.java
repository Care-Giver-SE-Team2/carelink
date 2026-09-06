package sg.nus.carelink.incident.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * JPA entity for table incident_acknowledgement.
 *
 * From family.urgent_alert_acknowledgments, retargeted at incident.
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
@Table(name = "incident_acknowledgement")
class IncidentAcknowledgementJpaEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "incident_id", nullable = false)
	private Long incidentId;

	@Column(name = "family_member_id", nullable = false)
	private Long familyMemberId;

	@Column(name = "viewed_at")
	private LocalDateTime viewedAt;

	@Column(name = "acknowledged_at")
	private LocalDateTime acknowledgedAt;

	@Column(name = "response_note", length = 255)
	private String responseNote;

	@Column(name = "created_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime createdAt;

	protected IncidentAcknowledgementJpaEntity() {
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

	Long getFamilyMemberId() {
		return familyMemberId;
	}

	void setFamilyMemberId(Long familyMemberId) {
		this.familyMemberId = familyMemberId;
	}

	LocalDateTime getViewedAt() {
		return viewedAt;
	}

	void setViewedAt(LocalDateTime viewedAt) {
		this.viewedAt = viewedAt;
	}

	LocalDateTime getAcknowledgedAt() {
		return acknowledgedAt;
	}

	void setAcknowledgedAt(LocalDateTime acknowledgedAt) {
		this.acknowledgedAt = acknowledgedAt;
	}

	String getResponseNote() {
		return responseNote;
	}

	void setResponseNote(String responseNote) {
		this.responseNote = responseNote;
	}

	LocalDateTime getCreatedAt() {
		return createdAt;
	}
}

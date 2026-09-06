package sg.nus.carelink.incident.infrastructure.persistence;

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
 * JPA entity for table incident.
 *
 * Merges manager.incident + elder.emergency_alert.
 *
 * DECISION 10  A one-touch SOS from the elder is an incident, not a separate
 *              kind of record. Keeping emergency_alert apart would mean the
 *              escalation chain and its timeout (SYS02) had to be built twice.
 *              `source` records where it came from; the location columns from
 *              emergency_alert are kept because an SOS carries them.
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
@Table(name = "incident")
class IncidentJpaEntity {

	enum Source {
		CAREGIVER, ELDER_SOS, SYSTEM_MISSED_CHECKIN
	}

	enum Category {
		SOS, MEDICAL, FALL, SERVICE, OTHER
	}

	enum Severity {
		LOW, MEDIUM, HIGH
	}

	enum Status {
		OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, UNRESOLVED_ESCALATED
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "elder_id", nullable = false)
	private Long elderId;

	/** set when raised during a visit */
	@Column(name = "visit_id")
	private Long visitId;

	/** soft FK to app_user.id */
	@Column(name = "reported_by_user_id")
	private Long reportedByUserId;

	/** soft FK to app_user.id; current owner */
	@Column(name = "responder_user_id")
	private Long responderUserId;

	@Enumerated(EnumType.STRING)
	@Column(name = "source", nullable = false)
	private Source source;

	@Enumerated(EnumType.STRING)
	@Column(name = "category", nullable = false)
	private Category category = Category.OTHER;

	@Enumerated(EnumType.STRING)
	@Column(name = "severity", nullable = false)
	private Severity severity;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false)
	private Status status = Status.OPEN;

	@Column(name = "latitude", precision = 10, scale = 7)
	private BigDecimal latitude;

	@Column(name = "longitude", precision = 10, scale = 7)
	private BigDecimal longitude;

	@Column(name = "location_text", length = 255)
	private String locationText;

	@Column(name = "description", length = 500)
	private String description;

	/** countdown deadline; SYS02 escalates past this */
	@Column(name = "respond_by")
	private LocalDateTime respondBy;

	@Column(name = "reported_at", nullable = false)
	private LocalDateTime reportedAt;

	@Column(name = "resolved_at")
	private LocalDateTime resolvedAt;

	protected IncidentJpaEntity() {
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

	Long getVisitId() {
		return visitId;
	}

	void setVisitId(Long visitId) {
		this.visitId = visitId;
	}

	Long getReportedByUserId() {
		return reportedByUserId;
	}

	void setReportedByUserId(Long reportedByUserId) {
		this.reportedByUserId = reportedByUserId;
	}

	Long getResponderUserId() {
		return responderUserId;
	}

	void setResponderUserId(Long responderUserId) {
		this.responderUserId = responderUserId;
	}

	Source getSource() {
		return source;
	}

	void setSource(Source source) {
		this.source = source;
	}

	Category getCategory() {
		return category;
	}

	void setCategory(Category category) {
		this.category = category;
	}

	Severity getSeverity() {
		return severity;
	}

	void setSeverity(Severity severity) {
		this.severity = severity;
	}

	Status getStatus() {
		return status;
	}

	void setStatus(Status status) {
		this.status = status;
	}

	BigDecimal getLatitude() {
		return latitude;
	}

	void setLatitude(BigDecimal latitude) {
		this.latitude = latitude;
	}

	BigDecimal getLongitude() {
		return longitude;
	}

	void setLongitude(BigDecimal longitude) {
		this.longitude = longitude;
	}

	String getLocationText() {
		return locationText;
	}

	void setLocationText(String locationText) {
		this.locationText = locationText;
	}

	String getDescription() {
		return description;
	}

	void setDescription(String description) {
		this.description = description;
	}

	LocalDateTime getRespondBy() {
		return respondBy;
	}

	void setRespondBy(LocalDateTime respondBy) {
		this.respondBy = respondBy;
	}

	LocalDateTime getReportedAt() {
		return reportedAt;
	}

	void setReportedAt(LocalDateTime reportedAt) {
		this.reportedAt = reportedAt;
	}

	LocalDateTime getResolvedAt() {
		return resolvedAt;
	}

	void setResolvedAt(LocalDateTime resolvedAt) {
		this.resolvedAt = resolvedAt;
	}
}

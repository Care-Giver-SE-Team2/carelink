package sg.nus.carelink.rostering.infrastructure.persistence;

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
 * JPA entity for table rostering_run.
 *
 * One click of "Re-roster" or "find a caregiver". A run covers one or many
 * visits: an absence vacates several at once (screen 4c re-rosters seven).
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
@Table(name = "rostering_run")
class RosteringRunJpaEntity {

	enum TriggerType {
		NEW_VISIT, ABSENCE, MANUAL
	}

	enum Objective {
		CONTINUITY, TRAVEL_TIME, EVEN_WORKLOAD, COST
	}

	enum Status {
		PROPOSED, COMMITTED, DISCARDED
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Enumerated(EnumType.STRING)
	@Column(name = "trigger_type", nullable = false)
	private TriggerType triggerType;

	/** the absence that vacated the visits, when trigger_type = ABSENCE */
	@Column(name = "absence_id")
	private Long absenceId;

	/** the Strategy that ran; screen 4c objective tabs */
	@Enumerated(EnumType.STRING)
	@Column(name = "objective", nullable = false)
	private Objective objective;

	/** soft FK to app_user.id */
	@Column(name = "requested_by_user_id")
	private Long requestedByUserId;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false)
	private Status status = Status.PROPOSED;

	@Column(name = "visits_total", nullable = false)
	private Integer visitsTotal = 0;

	@Column(name = "visits_covered", nullable = false)
	private Integer visitsCovered = 0;

	@Column(name = "continuity_kept", nullable = false)
	private Integer continuityKept = 0;

	@Column(name = "added_travel_km", precision = 6, scale = 1)
	private BigDecimal addedTravelKm;

	@Column(name = "ran_at", nullable = false)
	private LocalDateTime ranAt;

	@Column(name = "committed_at")
	private LocalDateTime committedAt;

	protected RosteringRunJpaEntity() {
	}

	Long getId() {
		return id;
	}

	TriggerType getTriggerType() {
		return triggerType;
	}

	void setTriggerType(TriggerType triggerType) {
		this.triggerType = triggerType;
	}

	Long getAbsenceId() {
		return absenceId;
	}

	void setAbsenceId(Long absenceId) {
		this.absenceId = absenceId;
	}

	Objective getObjective() {
		return objective;
	}

	void setObjective(Objective objective) {
		this.objective = objective;
	}

	Long getRequestedByUserId() {
		return requestedByUserId;
	}

	void setRequestedByUserId(Long requestedByUserId) {
		this.requestedByUserId = requestedByUserId;
	}

	Status getStatus() {
		return status;
	}

	void setStatus(Status status) {
		this.status = status;
	}

	Integer getVisitsTotal() {
		return visitsTotal;
	}

	void setVisitsTotal(Integer visitsTotal) {
		this.visitsTotal = visitsTotal;
	}

	Integer getVisitsCovered() {
		return visitsCovered;
	}

	void setVisitsCovered(Integer visitsCovered) {
		this.visitsCovered = visitsCovered;
	}

	Integer getContinuityKept() {
		return continuityKept;
	}

	void setContinuityKept(Integer continuityKept) {
		this.continuityKept = continuityKept;
	}

	BigDecimal getAddedTravelKm() {
		return addedTravelKm;
	}

	void setAddedTravelKm(BigDecimal addedTravelKm) {
		this.addedTravelKm = addedTravelKm;
	}

	LocalDateTime getRanAt() {
		return ranAt;
	}

	void setRanAt(LocalDateTime ranAt) {
		this.ranAt = ranAt;
	}

	LocalDateTime getCommittedAt() {
		return committedAt;
	}

	void setCommittedAt(LocalDateTime committedAt) {
		this.committedAt = committedAt;
	}
}

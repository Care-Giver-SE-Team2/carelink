package sg.nus.carelink.rostering.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * JPA entity for table rostering_candidate_check.
 *
 * The "constraints checked" panel on screen 1b, one row per rule per
 * candidate: Dialect match PASS, Certification valid PASS, Continuity
 * "2 prior visits", Daily hours cap "6.5 / 8.0".
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
@Table(name = "rostering_candidate_check")
class RosteringCandidateCheckJpaEntity {

	enum Result {
		PASS, FAIL, NOT_APPLICABLE
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "rostering_candidate_id", nullable = false)
	private Long rosteringCandidateId;

	@Column(name = "rostering_constraint_id", nullable = false)
	private Long rosteringConstraintId;

	@Enumerated(EnumType.STRING)
	@Column(name = "result", nullable = false)
	private Result result;

	/** what the screen shows next to the result */
	@Column(name = "detail", length = 100)
	private String detail;

	protected RosteringCandidateCheckJpaEntity() {
	}

	Long getId() {
		return id;
	}

	Long getRosteringCandidateId() {
		return rosteringCandidateId;
	}

	void setRosteringCandidateId(Long rosteringCandidateId) {
		this.rosteringCandidateId = rosteringCandidateId;
	}

	Long getRosteringConstraintId() {
		return rosteringConstraintId;
	}

	void setRosteringConstraintId(Long rosteringConstraintId) {
		this.rosteringConstraintId = rosteringConstraintId;
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
}

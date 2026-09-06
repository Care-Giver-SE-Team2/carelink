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

/**
 * JPA entity for table rostering_candidate.
 *
 * Every caregiver considered for every visit in the run, including those a
 * HARD constraint excluded. "Suggestion 1 of 4" is option_rank 1..4.
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
@Table(name = "rostering_candidate")
class RosteringCandidateJpaEntity {

	enum Outcome {
		SELECTED, SUGGESTED, EXCLUDED
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "rostering_run_id", nullable = false)
	private Long rosteringRunId;

	@Column(name = "visit_id", nullable = false)
	private Long visitId;

	@Column(name = "caregiver_id", nullable = false)
	private Long caregiverId;

	/** null when excluded */
	@Column(name = "option_rank")
	private Integer optionRank;

	/** objective score; its meaning depends on rostering_run.objective */
	@Column(name = "score", precision = 6, scale = 2)
	private BigDecimal score;

	@Enumerated(EnumType.STRING)
	@Column(name = "outcome", nullable = false)
	private Outcome outcome;

	/** rostering_constraint.code of the HARD rule that excluded this candidate */
	@Column(name = "excluded_by_code", length = 40)
	private String excludedByCode;

	protected RosteringCandidateJpaEntity() {
	}

	Long getId() {
		return id;
	}

	Long getRosteringRunId() {
		return rosteringRunId;
	}

	void setRosteringRunId(Long rosteringRunId) {
		this.rosteringRunId = rosteringRunId;
	}

	Long getVisitId() {
		return visitId;
	}

	void setVisitId(Long visitId) {
		this.visitId = visitId;
	}

	Long getCaregiverId() {
		return caregiverId;
	}

	void setCaregiverId(Long caregiverId) {
		this.caregiverId = caregiverId;
	}

	Integer getOptionRank() {
		return optionRank;
	}

	void setOptionRank(Integer optionRank) {
		this.optionRank = optionRank;
	}

	BigDecimal getScore() {
		return score;
	}

	void setScore(BigDecimal score) {
		this.score = score;
	}

	Outcome getOutcome() {
		return outcome;
	}

	void setOutcome(Outcome outcome) {
		this.outcome = outcome;
	}

	String getExcludedByCode() {
		return excludedByCode;
	}

	void setExcludedByCode(String excludedByCode) {
		this.excludedByCode = excludedByCode;
	}
}

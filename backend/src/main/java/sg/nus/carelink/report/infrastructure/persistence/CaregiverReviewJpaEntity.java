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
 * JPA entity for table caregiver_review.
 *
 * Merges family.periodic_caregiver_reviews with elder.renewal_decision.
 *
 * DECISION 14  The renewal decision is a column here, not a table of its own.
 *              elder.renewal_decision and family.periodic_caregiver_reviews
 *              recorded the same judgement twice; a periodic review that ends
 *              in a renewal decision is one act, not two.
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
@Table(name = "caregiver_review")
class CaregiverReviewJpaEntity {

	enum RenewalDecision {
		RENEW_CURRENT, REQUEST_CHANGE, CANCEL_SERVICE
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "family_member_id", nullable = false)
	private Long familyMemberId;

	@Column(name = "elder_id", nullable = false)
	private Long elderId;

	@Column(name = "caregiver_id", nullable = false)
	private Long caregiverId;

	@Column(name = "period_start", nullable = false)
	private LocalDate periodStart;

	@Column(name = "period_end", nullable = false)
	private LocalDate periodEnd;

	@Column(name = "overall_rating", nullable = false)
	private Byte overallRating;

	@Column(name = "punctuality_score")
	private Byte punctualityScore;

	@Column(name = "care_quality_score")
	private Byte careQualityScore;

	@JdbcTypeCode(SqlTypes.LONGVARCHAR)
	@Column(name = "feedback_notes")
	private String feedbackNotes;

	@Enumerated(EnumType.STRING)
	@Column(name = "renewal_decision", nullable = false)
	private RenewalDecision renewalDecision = RenewalDecision.RENEW_CURRENT;

	@Column(name = "created_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime createdAt;

	protected CaregiverReviewJpaEntity() {
	}

	Long getId() {
		return id;
	}

	Long getFamilyMemberId() {
		return familyMemberId;
	}

	void setFamilyMemberId(Long familyMemberId) {
		this.familyMemberId = familyMemberId;
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

	Byte getOverallRating() {
		return overallRating;
	}

	void setOverallRating(Byte overallRating) {
		this.overallRating = overallRating;
	}

	Byte getPunctualityScore() {
		return punctualityScore;
	}

	void setPunctualityScore(Byte punctualityScore) {
		this.punctualityScore = punctualityScore;
	}

	Byte getCareQualityScore() {
		return careQualityScore;
	}

	void setCareQualityScore(Byte careQualityScore) {
		this.careQualityScore = careQualityScore;
	}

	String getFeedbackNotes() {
		return feedbackNotes;
	}

	void setFeedbackNotes(String feedbackNotes) {
		this.feedbackNotes = feedbackNotes;
	}

	RenewalDecision getRenewalDecision() {
		return renewalDecision;
	}

	void setRenewalDecision(RenewalDecision renewalDecision) {
		this.renewalDecision = renewalDecision;
	}

	LocalDateTime getCreatedAt() {
		return createdAt;
	}
}

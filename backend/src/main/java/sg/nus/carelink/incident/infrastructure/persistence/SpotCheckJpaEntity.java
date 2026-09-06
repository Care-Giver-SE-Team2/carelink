package sg.nus.carelink.incident.infrastructure.persistence;

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
 * JPA entity for table spot_check.
 *
 * Merges manager.spot_check + family.home_inspection_consents.
 *
 * DECISION 11  These were the two ends of one flow: the manager proposes a
 *              check, the family approves it. Two tables would have meant two
 *              statuses that could disagree with each other.
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
@Table(name = "spot_check")
class SpotCheckJpaEntity {

	enum ApprovalStatus {
		PENDING_APPROVAL, APPROVED, REJECTED
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "elder_id", nullable = false)
	private Long elderId;

	@Column(name = "caregiver_id")
	private Long caregiverId;

	@Column(name = "visit_id")
	private Long visitId;

	/** soft FK to app_user.id */
	@Column(name = "raised_by_user_id")
	private Long raisedByUserId;

	@Column(name = "approving_family_member_id")
	private Long approvingFamilyMemberId;

	@Column(name = "proposed_time", nullable = false)
	private LocalDateTime proposedTime;

	@Column(name = "reason", length = 255)
	private String reason;

	@Enumerated(EnumType.STRING)
	@Column(name = "approval_status", nullable = false)
	private ApprovalStatus approvalStatus = ApprovalStatus.PENDING_APPROVAL;

	@Column(name = "decided_at")
	private LocalDateTime decidedAt;

	@Column(name = "finding", length = 500)
	private String finding;

	/** caregiver analysis: the caregiver may respond to a finding */
	@Column(name = "caregiver_response", length = 500)
	private String caregiverResponse;

	@Column(name = "checked_at")
	private LocalDateTime checkedAt;

	@Column(name = "created_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime createdAt;

	protected SpotCheckJpaEntity() {
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

	Long getCaregiverId() {
		return caregiverId;
	}

	void setCaregiverId(Long caregiverId) {
		this.caregiverId = caregiverId;
	}

	Long getVisitId() {
		return visitId;
	}

	void setVisitId(Long visitId) {
		this.visitId = visitId;
	}

	Long getRaisedByUserId() {
		return raisedByUserId;
	}

	void setRaisedByUserId(Long raisedByUserId) {
		this.raisedByUserId = raisedByUserId;
	}

	Long getApprovingFamilyMemberId() {
		return approvingFamilyMemberId;
	}

	void setApprovingFamilyMemberId(Long approvingFamilyMemberId) {
		this.approvingFamilyMemberId = approvingFamilyMemberId;
	}

	LocalDateTime getProposedTime() {
		return proposedTime;
	}

	void setProposedTime(LocalDateTime proposedTime) {
		this.proposedTime = proposedTime;
	}

	String getReason() {
		return reason;
	}

	void setReason(String reason) {
		this.reason = reason;
	}

	ApprovalStatus getApprovalStatus() {
		return approvalStatus;
	}

	void setApprovalStatus(ApprovalStatus approvalStatus) {
		this.approvalStatus = approvalStatus;
	}

	LocalDateTime getDecidedAt() {
		return decidedAt;
	}

	void setDecidedAt(LocalDateTime decidedAt) {
		this.decidedAt = decidedAt;
	}

	String getFinding() {
		return finding;
	}

	void setFinding(String finding) {
		this.finding = finding;
	}

	String getCaregiverResponse() {
		return caregiverResponse;
	}

	void setCaregiverResponse(String caregiverResponse) {
		this.caregiverResponse = caregiverResponse;
	}

	LocalDateTime getCheckedAt() {
		return checkedAt;
	}

	void setCheckedAt(LocalDateTime checkedAt) {
		this.checkedAt = checkedAt;
	}

	LocalDateTime getCreatedAt() {
		return createdAt;
	}
}

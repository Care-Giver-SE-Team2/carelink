package sg.nus.carelink.visit.infrastructure.persistence;

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
 * JPA entity for table visit_evidence.
 *
 * From the caregiver analysis (VisitEvidence). What kinds are required comes from
 * care_plan_node.evidence_type; the visit cannot close until they are present.
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
@Table(name = "visit_evidence")
class VisitEvidenceJpaEntity {

	enum Kind {
		PHOTO, SIGNATURE, CHECKLIST, READING, NOTE
	}

	enum VerificationStatus {
		UNVERIFIED, VERIFIED, REJECTED
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "visit_id", nullable = false)
	private Long visitId;

	@Enumerated(EnumType.STRING)
	@Column(name = "kind", nullable = false)
	private Kind kind;

	/** stored file reference */
	@Column(name = "reference", nullable = false, length = 255)
	private String reference;

	@Enumerated(EnumType.STRING)
	@Column(name = "verification_status", nullable = false)
	private VerificationStatus verificationStatus = VerificationStatus.UNVERIFIED;

	@Column(name = "captured_at", nullable = false)
	private LocalDateTime capturedAt;

	protected VisitEvidenceJpaEntity() {
	}

	Long getId() {
		return id;
	}

	Long getVisitId() {
		return visitId;
	}

	void setVisitId(Long visitId) {
		this.visitId = visitId;
	}

	Kind getKind() {
		return kind;
	}

	void setKind(Kind kind) {
		this.kind = kind;
	}

	String getReference() {
		return reference;
	}

	void setReference(String reference) {
		this.reference = reference;
	}

	VerificationStatus getVerificationStatus() {
		return verificationStatus;
	}

	void setVerificationStatus(VerificationStatus verificationStatus) {
		this.verificationStatus = verificationStatus;
	}

	LocalDateTime getCapturedAt() {
		return capturedAt;
	}

	void setCapturedAt(LocalDateTime capturedAt) {
		this.capturedAt = capturedAt;
	}
}

package sg.nus.carelink.profile.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * JPA entity for table credential.
 *
 * From manager.credential, now pointing at credential_type. SYS01 scans
 * expiry_date daily; screen 2d shows the 30-day warning threshold.
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
@Table(name = "credential")
class CredentialJpaEntity {

	enum Status {
		SUBMITTED, PUBLISHED, REJECTED, EXPIRING, EXPIRED, REVOKED
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "caregiver_id", nullable = false)
	private Long caregiverId;

	@Column(name = "credential_type_id", nullable = false)
	private Long credentialTypeId;

	/** soft FK to app_user.id */
	@Column(name = "reviewed_by_user_id")
	private Long reviewedByUserId;

	@Column(name = "certificate_no", length = 100)
	private String certificateNo;

	@Column(name = "issuing_body", length = 150)
	private String issuingBody;

	@Column(name = "valid_from")
	private LocalDate validFrom;

	/** default = permanent; the daily expiry scan never reaches it */
	@Column(name = "expiry_date", nullable = false)
	private LocalDate expiryDate;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false)
	private Status status = Status.SUBMITTED;

	@Column(name = "created_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime updatedAt;

	/** FK self: the credential this one replaces on renewal; null for a first submission */
	@Column(name = "renews_credential_id")
	private Long renewsCredentialId;

	protected CredentialJpaEntity() {
	}

	Long getId() {
		return id;
	}

	Long getCaregiverId() {
		return caregiverId;
	}

	void setCaregiverId(Long caregiverId) {
		this.caregiverId = caregiverId;
	}

	Long getCredentialTypeId() {
		return credentialTypeId;
	}

	void setCredentialTypeId(Long credentialTypeId) {
		this.credentialTypeId = credentialTypeId;
	}

	Long getReviewedByUserId() {
		return reviewedByUserId;
	}

	void setReviewedByUserId(Long reviewedByUserId) {
		this.reviewedByUserId = reviewedByUserId;
	}

	String getCertificateNo() {
		return certificateNo;
	}

	void setCertificateNo(String certificateNo) {
		this.certificateNo = certificateNo;
	}

	String getIssuingBody() {
		return issuingBody;
	}

	void setIssuingBody(String issuingBody) {
		this.issuingBody = issuingBody;
	}

	LocalDate getValidFrom() {
		return validFrom;
	}

	void setValidFrom(LocalDate validFrom) {
		this.validFrom = validFrom;
	}

	LocalDate getExpiryDate() {
		return expiryDate;
	}

	void setExpiryDate(LocalDate expiryDate) {
		this.expiryDate = expiryDate;
	}

	Status getStatus() {
		return status;
	}

	void setStatus(Status status) {
		this.status = status;
	}

	LocalDateTime getCreatedAt() {
		return createdAt;
	}

	LocalDateTime getUpdatedAt() {
		return updatedAt;
	}

	Long getRenewsCredentialId() {
		return renewsCredentialId;
	}

	void setRenewsCredentialId(Long renewsCredentialId) {
		this.renewsCredentialId = renewsCredentialId;
	}
}

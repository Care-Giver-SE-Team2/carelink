package sg.nus.carelink.profile.infrastructure.persistence;

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
 * JPA entity for table caregiver.
 *
 * Merges elder.caregiver + manager.caregiver.
 * The two definitions disagreed on almost everything: BIGINT vs INT,
 * full_name vs name, and whether a caregiver has an account at all.
 * Resolved in favour of elder's version (accounts exist, statuses matter)
 * plus manager's sector.
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
@Table(name = "caregiver")
class CaregiverJpaEntity {

	enum Status {
		ONBOARDING, AVAILABLE, BUSY, INACTIVE
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** soft FK to app_user.id; a caregiver always has an account */
	@Column(name = "user_id", nullable = false, unique = true)
	private Long userId;

	@Column(name = "full_name", nullable = false, length = 100)
	private String fullName;

	@Column(name = "phone", length = 20)
	private String phone;

	@Column(name = "sector", length = 50)
	private String sector;

	/** comma-separated; supervisor ERD screen 1b */
	@Column(name = "dialects", length = 100)
	private String dialects;

	/** ONBOARDING until the first credential is PUBLISHED; the CERTIFICATION_VALID rostering rule excludes ONBOARDING caregivers */
	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false)
	private Status status = Status.ONBOARDING;

	@Column(name = "created_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime updatedAt;

	protected CaregiverJpaEntity() {
	}

	Long getId() {
		return id;
	}

	Long getUserId() {
		return userId;
	}

	void setUserId(Long userId) {
		this.userId = userId;
	}

	String getFullName() {
		return fullName;
	}

	void setFullName(String fullName) {
		this.fullName = fullName;
	}

	String getPhone() {
		return phone;
	}

	void setPhone(String phone) {
		this.phone = phone;
	}

	String getSector() {
		return sector;
	}

	void setSector(String sector) {
		this.sector = sector;
	}

	String getDialects() {
		return dialects;
	}

	void setDialects(String dialects) {
		this.dialects = dialects;
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
}

package sg.nus.carelink.profile.infrastructure.persistence;

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
 * JPA entity for table elder.
 *
 * Merges elder.elderly + manager.elder, plus the profile fields the supervisor's
 * per-screen ERDs carried but the consolidated SQL dropped (dialect, lives_alone,
 * mobility, continuity_preference) and the ones family's intake form collects.
 * These are the inputs the rostering rules check on screen 1b: dialect match,
 * postal sector band, continuity of caregiver.
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
@Table(name = "elder")
class ElderJpaEntity {

	enum Gender {
		MALE, FEMALE, OTHER
	}

	enum MobilityLevel {
		INDEPENDENT, ASSISTIVE_CANE, WHEELCHAIR_BEDBOUND
	}

	enum ContinuityPreference {
		PREFERRED, REQUIRED, NONE
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** soft FK to app_user.id; null until an account is issued */
	@Column(name = "user_id", unique = true)
	private Long userId;

	@Column(name = "full_name", nullable = false, length = 100)
	private String fullName;

	@Enumerated(EnumType.STRING)
	@Column(name = "gender")
	private Gender gender;

	@Column(name = "date_of_birth")
	private LocalDate dateOfBirth;

	@Column(name = "phone", length = 20)
	private String phone;

	@Column(name = "address", length = 255)
	private String address;

	@Column(name = "postal_code", length = 10)
	private String postalCode;

	/** locality band used when matching caregivers */
	@Column(name = "sector", length = 50)
	private String sector;

	/** comma-separated; matched against caregiver.dialects */
	@Column(name = "preferred_dialects", length = 100)
	private String preferredDialects;

	@Column(name = "lives_alone")
	private Boolean livesAlone;

	@Enumerated(EnumType.STRING)
	@Column(name = "mobility_level")
	private MobilityLevel mobilityLevel;

	/** how strongly the same caregiver should be kept */
	@Enumerated(EnumType.STRING)
	@Column(name = "continuity_preference", nullable = false)
	private ContinuityPreference continuityPreference = ContinuityPreference.PREFERRED;

	@JdbcTypeCode(SqlTypes.LONGVARCHAR)
	@Column(name = "medical_notes")
	private String medicalNotes;

	@Column(name = "created_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime updatedAt;

	protected ElderJpaEntity() {
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

	Gender getGender() {
		return gender;
	}

	void setGender(Gender gender) {
		this.gender = gender;
	}

	LocalDate getDateOfBirth() {
		return dateOfBirth;
	}

	void setDateOfBirth(LocalDate dateOfBirth) {
		this.dateOfBirth = dateOfBirth;
	}

	String getPhone() {
		return phone;
	}

	void setPhone(String phone) {
		this.phone = phone;
	}

	String getAddress() {
		return address;
	}

	void setAddress(String address) {
		this.address = address;
	}

	String getPostalCode() {
		return postalCode;
	}

	void setPostalCode(String postalCode) {
		this.postalCode = postalCode;
	}

	String getSector() {
		return sector;
	}

	void setSector(String sector) {
		this.sector = sector;
	}

	String getPreferredDialects() {
		return preferredDialects;
	}

	void setPreferredDialects(String preferredDialects) {
		this.preferredDialects = preferredDialects;
	}

	Boolean getLivesAlone() {
		return livesAlone;
	}

	void setLivesAlone(Boolean livesAlone) {
		this.livesAlone = livesAlone;
	}

	MobilityLevel getMobilityLevel() {
		return mobilityLevel;
	}

	void setMobilityLevel(MobilityLevel mobilityLevel) {
		this.mobilityLevel = mobilityLevel;
	}

	ContinuityPreference getContinuityPreference() {
		return continuityPreference;
	}

	void setContinuityPreference(ContinuityPreference continuityPreference) {
		this.continuityPreference = continuityPreference;
	}

	String getMedicalNotes() {
		return medicalNotes;
	}

	void setMedicalNotes(String medicalNotes) {
		this.medicalNotes = medicalNotes;
	}

	LocalDateTime getCreatedAt() {
		return createdAt;
	}

	LocalDateTime getUpdatedAt() {
		return updatedAt;
	}
}

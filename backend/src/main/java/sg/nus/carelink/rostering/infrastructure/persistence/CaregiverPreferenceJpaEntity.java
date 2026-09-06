package sg.nus.carelink.rostering.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * JPA entity for table caregiver_preference.
 *
 * From the caregiver analysis (WorkPreference). UC-CG02: what the caregiver would
 * prefer. Rostering reads it as a soft preference; it never overrides a hard
 * constraint such as an expired credential or an approved absence.
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
@Table(name = "caregiver_preference")
class CaregiverPreferenceJpaEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "caregiver_id", nullable = false, unique = true)
	private Long caregiverId;

	/** comma-separated */
	@Column(name = "preferred_service_types", length = 255)
	private String preferredServiceTypes;

	/** comma-separated */
	@Column(name = "preferred_sectors", length = 255)
	private String preferredSectors;

	/** e.g. MON 08:00-12:00;WED 13:00-17:00 */
	@Column(name = "preferred_time_windows", length = 255)
	private String preferredTimeWindows;

	@Column(name = "max_visits_per_day")
	private Integer maxVisitsPerDay;

	/** screen 1b checks "daily hours cap" against this */
	@Column(name = "max_hours_per_day", precision = 4, scale = 1)
	private BigDecimal maxHoursPerDay;

	@Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime updatedAt;

	protected CaregiverPreferenceJpaEntity() {
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

	String getPreferredServiceTypes() {
		return preferredServiceTypes;
	}

	void setPreferredServiceTypes(String preferredServiceTypes) {
		this.preferredServiceTypes = preferredServiceTypes;
	}

	String getPreferredSectors() {
		return preferredSectors;
	}

	void setPreferredSectors(String preferredSectors) {
		this.preferredSectors = preferredSectors;
	}

	String getPreferredTimeWindows() {
		return preferredTimeWindows;
	}

	void setPreferredTimeWindows(String preferredTimeWindows) {
		this.preferredTimeWindows = preferredTimeWindows;
	}

	Integer getMaxVisitsPerDay() {
		return maxVisitsPerDay;
	}

	void setMaxVisitsPerDay(Integer maxVisitsPerDay) {
		this.maxVisitsPerDay = maxVisitsPerDay;
	}

	BigDecimal getMaxHoursPerDay() {
		return maxHoursPerDay;
	}

	void setMaxHoursPerDay(BigDecimal maxHoursPerDay) {
		this.maxHoursPerDay = maxHoursPerDay;
	}

	LocalDateTime getUpdatedAt() {
		return updatedAt;
	}
}

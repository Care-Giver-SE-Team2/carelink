package sg.nus.carelink.profile.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * JPA entity for table family_member.
 *
 * Merges elder.family_member + family.family_members + manager.family_member.
 *
 * DECISION 7  A family member is an account holder in their own right, not an
 *             attribute of one elder. manager.family_member carried an elder_id,
 *             which cannot express a person who looks after two elders. The
 *             relationship lives in elder_family_binding instead.
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
@Table(name = "family_member")
class FamilyMemberJpaEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** soft FK to app_user.id */
	@Column(name = "user_id", unique = true)
	private Long userId;

	@Column(name = "full_name", nullable = false, length = 100)
	private String fullName;

	@Column(name = "phone", length = 20)
	private String phone;

	@Column(name = "residential_address", length = 255)
	private String residentialAddress;

	@Column(name = "created_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime updatedAt;

	protected FamilyMemberJpaEntity() {
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

	String getResidentialAddress() {
		return residentialAddress;
	}

	void setResidentialAddress(String residentialAddress) {
		this.residentialAddress = residentialAddress;
	}

	LocalDateTime getCreatedAt() {
		return createdAt;
	}

	LocalDateTime getUpdatedAt() {
		return updatedAt;
	}
}

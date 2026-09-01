package sg.nus.carelink.identity.infrastructure.persistence;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * JPA 实体，与领域模型 {@link sg.nus.carelink.identity.domain.model.AppUser} 分开。
 *
 * <p>分开的代价是要写一个 Mapper，收益是领域模型不被 JPA 的生命周期、
 * 延迟加载、无参构造等约束绑架，能当普通对象测试。
 *
 * <p>表结构由 Flyway 的 V1__baseline.sql 定义，Hibernate 只做 validate，绝不自动改表。
 */
@Entity
@Table(name = "app_user")
class AppUserJpaEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "username", nullable = false, length = 64, unique = true)
	private String username;

	@Column(name = "password_hash", nullable = false, length = 255)
	private String passwordHash;

	@Column(name = "display_name", nullable = false, length = 128)
	private String displayName;

	@Column(name = "enabled", nullable = false)
	private boolean enabled;

	@Column(name = "created_at", nullable = false, insertable = false, updatable = false)
	private LocalDateTime createdAt;

	@ElementCollection(fetch = FetchType.EAGER)
	@CollectionTable(name = "user_role", joinColumns = @JoinColumn(name = "user_id"))
	@Column(name = "role", nullable = false, length = 32)
	private Set<String> roles = new LinkedHashSet<>();

	protected AppUserJpaEntity() {
	}

	Long getId() {
		return id;
	}

	String getUsername() {
		return username;
	}

	String getPasswordHash() {
		return passwordHash;
	}

	String getDisplayName() {
		return displayName;
	}

	boolean isEnabled() {
		return enabled;
	}

	Set<String> getRoles() {
		return roles;
	}
}

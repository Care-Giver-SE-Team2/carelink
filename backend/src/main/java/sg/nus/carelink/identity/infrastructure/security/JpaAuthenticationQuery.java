package sg.nus.carelink.identity.infrastructure.security;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * 用 JdbcClient 直接查两张表。这里不经过 JPA：认证是启动路径上最热的查询之一，
 * 而且需要的字段（含密码散列）刻意不在 JPA 实体对外暴露的 getter 之列。
 */
@Component
class JpaAuthenticationQuery implements AuthenticationQuery {

	private final JdbcClient jdbc;

	JpaAuthenticationQuery(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	@Override
	public Optional<Credentials> findCredentials(String username) {
		Optional<Row> row = jdbc.sql("""
						SELECT id, username, password_hash, enabled
						  FROM app_user
						 WHERE username = :username
						""")
				.param("username", username)
				.query(Row.class)
				.optional();

		return row.map(r -> {
			List<String> roles = jdbc.sql("SELECT role FROM user_role WHERE user_id = :id")
					.param("id", r.id())
					.query(String.class)
					.list();
			Set<String> authorities = roles.stream().map(role -> "ROLE_" + role).collect(java.util.stream.Collectors.toUnmodifiableSet());
			return new Credentials(r.username(), r.passwordHash(), r.enabled(), authorities);
		});
	}

	record Row(Long id, String username, String passwordHash, boolean enabled) {
	}
}

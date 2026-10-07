package sg.nus.carelink.notification.infrastructure.lookup;

import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import sg.nus.carelink.notification.domain.repository.RecipientDirectory;

/**
 * Reads {@code app_user}, which identity owns, with one plain statement - the way the other
 * modules' notifiers find their recipients - so this module needs nothing of identity's code.
 */
@Component
class JdbcRecipientDirectory implements RecipientDirectory {

	private final JdbcClient jdbc;

	JdbcRecipientDirectory(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	@Override
	public Optional<Long> userIdOf(String username) {
		return jdbc.sql("select id from app_user where username = :username")
				.param("username", username)
				.query(Long.class)
				.optional();
	}
}

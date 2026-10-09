package sg.nus.carelink.report.infrastructure.notify;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import sg.nus.carelink.report.domain.repository.ValueAddedServiceAlert;

/**
 * Writes UC-FM08's dispatch notice as rows in {@code notification}, the in-app inbox every
 * manager's bell reads. The managers are found the way the absence and incident notifiers find
 * them: every enabled account with the MANAGER role. The row points at the visit, which the
 * manager assigns from the roster.
 *
 * <p>Reads {@code elder} for the elder's name with a plain statement that takes an id. Reading
 * is not owning; the profile module does not change for this.
 */
@Component
class NotificationTableValueAddedServiceAlert implements ValueAddedServiceAlert {

	private static final String MANAGERS = """
			select u.id from app_user u join user_role r on r.user_id = u.id
			where r.role = 'MANAGER' and u.enabled = true
			""";

	private static final String ELDER_NAME = "select full_name from elder where id = :elderId";

	private static final String INSERT = """
			insert into notification
			    (recipient_user_id, event_type, channel, title, body, resource_type, resource_id, status, created_at)
			values (:userId, 'EXTRA_SERVICE_DISPATCHED', 'IN_APP', :title, :body, 'VISIT', :visitId, 'PENDING', :createdAt)
			""";

	private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEE d MMM", Locale.ENGLISH);
	private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm", Locale.ENGLISH);

	private final JdbcClient jdbc;
	private final Clock clock;

	NotificationTableValueAddedServiceAlert(JdbcClient jdbc, Clock clock) {
		this.jdbc = jdbc;
		this.clock = clock;
	}

	@Override
	public void dispatched(Dispatched what) {
		String elder = jdbc.sql(ELDER_NAME).param("elderId", what.elderId()).query(String.class).optional()
				.orElse("An elder");
		String when = "%s, %s–%s".formatted(what.start().format(DAY), what.start().format(TIME),
				what.end().format(TIME));
		String title = "Assign a caregiver: %s for %s".formatted(what.serviceName(), elder);
		String body = ("The family approved %s's request for %s on %s. Nobody is on the visit yet; assign a caregiver"
				+ " from Unassigned visits on the Roster for that day before it starts.")
				.formatted(elder, what.serviceName().toLowerCase(Locale.ENGLISH), when);

		List<Long> managers = jdbc.sql(MANAGERS).query(Long.class).list();
		Timestamp now = Timestamp.valueOf(LocalDateTime.now(clock));
		for (Long manager : managers) {
			jdbc.sql(INSERT)
					.param("userId", manager)
					.param("title", trim(title, 150))
					.param("body", trim(body, 1000))
					.param("visitId", what.visitId())
					.param("createdAt", now)
					.update();
		}
	}

	private static String trim(String text, int max) {
		return text.length() <= max ? text : text.substring(0, max - 3) + "...";
	}
}

package sg.nus.carelink.incident.infrastructure.notify;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.repository.IncidentAlert;
import sg.nus.carelink.shared.security.Role;

/**
 * Writes alerts as rows in {@code notification}, which is what the in-app inbox reads.
 *
 * <p>Nothing sends these anywhere. Push, SMS and e-mail would need a component that polls
 * this table, calls whatever carries the message, and moves the row to SENT or FAILED with
 * a retry; that is SUP-02 notification dispatch (use case specification v3.0 §2.2), and
 * nobody has taken it on. Until somebody does, a row with {@code status = PENDING} is the
 * honest state: the alert exists and is addressed, and whoever builds the sender will find
 * it waiting rather than having to work out the audience again.
 *
 * <p>Reads three tables it does not own - {@code user_role}, {@code elder_family_binding},
 * {@code visit} - with plain statements that take an id and nothing else. Reading is not
 * owning; no other module's code changes for this to work.
 */
@Component
class NotificationTableAlert implements IncidentAlert {

	private static final String MANAGERS = """
			select u.id from app_user u
			join user_role r on r.user_id = u.id
			where u.enabled = true and r.role = :role
			""";

	/**
	 * Family members with a binding that is active now, through to their account.
	 *
	 * <p>The moment is bound as a parameter rather than read with SQL {@code now()}, and the
	 * difference matters. {@code expires_at} was written by the application, whose JVM zone
	 * and JDBC connection zone differ, so the driver converts it on the way in and out;
	 * {@code now()} is the database's own clock and gets no such conversion. Comparing the
	 * two answers the wrong question, and would keep an expired binding receiving alerts.
	 * Both sides of the comparison have to have travelled the same path.
	 */
	private static final String BOUND_FAMILY = """
			select f.user_id from elder_family_binding b
			join family_member f on f.id = b.family_member_id
			where b.elder_id = :elderId
			  and b.status = 'ACTIVE'
			  and (b.expires_at is null or b.expires_at > :now)
			  and f.user_id is not null
			""";

	/** The caregiver on this elder's most recent visit, if there has been one. */
	private static final String RECENT_CAREGIVER = """
			select c.user_id from visit v
			join caregiver c on c.id = v.caregiver_id
			where v.elder_id = :elderId and v.caregiver_id is not null
			order by v.scheduled_start desc
			limit 1
			""";

	private static final String INSERT = """
			insert into notification
			    (recipient_user_id, event_type, channel, title, body, resource_type, resource_id, status)
			values (:userId, :eventType, 'IN_APP', :title, :body, 'INCIDENT', :incidentId, 'PENDING')
			""";

	private final JdbcClient jdbc;
	private final Clock clock;

	NotificationTableAlert(JdbcClient jdbc, Clock clock) {
		this.jdbc = jdbc;
		this.clock = clock;
	}

	@Override
	public int broadcastRaised(Incident incident) {
		Set<Long> audience = new LinkedHashSet<>(managers());
		audience.addAll(boundFamily(incident.elderId()));
		audience.addAll(recentCaregiver(incident.elderId()));

		String title = "%s: %s".formatted(incident.severity(), incident.category());
		String body = "%s. %s".formatted(
				describeSource(incident.source()),
				incident.description() == null ? "No description given." : incident.description());

		for (Long userId : audience) {
			write(userId, "INCIDENT_RAISED", title, body, incident.id());
		}
		return audience.size();
	}

	@Override
	public void handedOver(Incident incident, Long fromUserId, Long toUserId) {
		if (toUserId != null) {
			write(toUserId, "INCIDENT_ASSIGNED",
					"You are now responsible for incident %d".formatted(incident.id()),
					"Respond by %s.".formatted(incident.respondBy()), incident.id());
		}
		if (fromUserId != null && !fromUserId.equals(toUserId)) {
			write(fromUserId, "INCIDENT_MOVED_ON",
					"Incident %d has moved to another responder".formatted(incident.id()),
					"Your record of it stays on the timeline.", incident.id());
		}
	}

	@Override
	public void chainExhausted(Incident incident) {
		for (Long userId : boundFamily(incident.elderId())) {
			write(userId, "INCIDENT_UNRESOLVED",
					"Incident %d has not been taken up".formatted(incident.id()),
					"The institution has been unable to assign a responder. Please contact them directly.",
					incident.id());
		}
	}

	// -------------------------------------------------------------------- queries ---

	private List<Long> managers() {
		return jdbc.sql(MANAGERS).param("role", Role.MANAGER.name()).query(Long.class).list();
	}

	private List<Long> boundFamily(Long elderId) {
		return elderId == null
				? List.of()
				: jdbc.sql(BOUND_FAMILY)
						.param("elderId", elderId)
						.param("now", LocalDateTime.now(clock))
						.query(Long.class)
						.list();
	}

	private List<Long> recentCaregiver(Long elderId) {
		if (elderId == null) {
			return List.of();
		}
		List<Long> found = new ArrayList<>(
				jdbc.sql(RECENT_CAREGIVER).param("elderId", elderId).query(Long.class).list());
		found.removeIf(java.util.Objects::isNull);
		return found;
	}

	private void write(Long userId, String eventType, String title, String body, Long incidentId) {
		jdbc.sql(INSERT)
				.param("userId", userId)
				.param("eventType", eventType)
				.param("title", trim(title, 150))
				.param("body", trim(body, 1000))
				.param("incidentId", incidentId)
				.update();
	}

	private static String trim(String text, int max) {
		if (text == null) {
			return null;
		}
		return text.length() <= max ? text : text.substring(0, max - 3) + "...";
	}

	private static String describeSource(Incident.Source source) {
		return switch (source) {
			case ELDER_SOS -> "Raised by the elder's emergency button";
			case CAREGIVER -> "Reported by a caregiver";
			case ELDER_SERVICE_DISPUTE -> "Raised by the elder after disputing a completed service";
			case SYSTEM_MISSED_CHECKIN -> "Raised automatically by a missed check-in";
		};
	}
}

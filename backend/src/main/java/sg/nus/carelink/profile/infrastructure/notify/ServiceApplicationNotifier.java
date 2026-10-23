package sg.nus.carelink.profile.infrastructure.notify;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import sg.nus.carelink.profile.application.FamilyAlertRecipients;
import sg.nus.carelink.profile.application.ServiceApplicationDeclined;
import sg.nus.carelink.profile.application.ServiceApplicationSubmitted;

/**
 * Tells the managers when a family submits a service application, and the family member who
 * applied when a manager declines it. Both messages link to the application (SERVICE_APPLICATION),
 * which the inbox resolves to its elder: the manager's bell opens that elder's care plan, where
 * the request is answered, and the family's opens the application. The decline goes only to the
 * applicant, and only while their binding to the elder is active.
 *
 * <p>Runs after the submission or decline commits and writes on its own, so a failed
 * notification never undoes either; it is logged instead.
 */
@Component
class ServiceApplicationNotifier {

	static final String SUBMITTED = "SERVICE_APPLICATION_SUBMITTED";
	static final String DECLINED = "SERVICE_APPLICATION_DECLINED";
	static final String RESOURCE = "SERVICE_APPLICATION";

	private static final Logger log = LoggerFactory.getLogger(ServiceApplicationNotifier.class);

	private final JdbcClient jdbc;
	private final FamilyAlertRecipients families;
	private final Clock clock;

	ServiceApplicationNotifier(JdbcClient jdbc, FamilyAlertRecipients families, Clock clock) {
		this.jdbc = jdbc;
		this.families = families;
		this.clock = clock;
	}

	@TransactionalEventListener
	void onSubmitted(ServiceApplicationSubmitted event) {
		try {
			String elder = elderName(event.elderId());
			String title = "New service application for " + elder;
			String body = "The family asked for " + event.careNeedCount()
					+ (event.careNeedCount() == 1 ? " care service" : " care services")
					+ ". Plan it or decline it on " + elder + "'s care plan.";
			managers().forEach(manager -> insert(manager, SUBMITTED, title, body, event.applicationId()));
		} catch (RuntimeException failure) {
			log.error("Could not tell the managers about service application {}", event.applicationId(), failure);
		}
	}

	@TransactionalEventListener
	void onDeclined(ServiceApplicationDeclined event) {
		try {
			FamilyAlertRecipients.Candidate applicant = families.resolve(event.elderId(), event.applicantFamilyMemberId());
			if (!applicant.eligible() || applicant.userId() == null) {
				return;
			}
			String title = "Service application for " + elderName(event.elderId())
					+ (event.partlyPlanned() ? " partly declined" : " declined");
			String body = (event.partlyPlanned()
					? "Some of what you asked for is in the care plan; the care team could not add the rest. "
					: "The care team could not add what you asked for to the care plan. ")
					+ "Reason: " + event.reason();
			insert(applicant.userId(), DECLINED, title, body, event.applicationId());
		} catch (RuntimeException failure) {
			log.error("Could not tell family member {} that service application {} was declined",
					event.applicantFamilyMemberId(), event.applicationId(), failure);
		}
	}

	private List<Long> managers() {
		return jdbc.sql("""
				select distinct u.id from app_user u
				join user_role r on r.user_id = u.id
				where r.role = 'MANAGER' and u.enabled = true
				""").query(Long.class).list();
	}

	private String elderName(Long elderId) {
		return jdbc.sql("select full_name from elder where id = :id").param("id", elderId)
				.query(String.class).optional().orElse("Elder #" + elderId);
	}

	private void insert(Long recipient, String event, String title, String body, Long applicationId) {
		jdbc.sql("""
				insert into notification
				(recipient_user_id,event_type,channel,title,body,resource_type,resource_id,status,created_at)
				values (:recipient,:event,'IN_APP',:title,:body,:type,:resource,'PENDING',:createdAt)
				""").param("recipient", recipient).param("event", event)
				// Stamped from the application clock, as the other notifiers do, so the inbox orders it with them.
				.param("createdAt", Timestamp.valueOf(LocalDateTime.now(clock)))
				.param("title", clip(title, 150)).param("body", clip(body, 1000))
				.param("type", RESOURCE).param("resource", applicationId).update();
	}

	private static String clip(String text, int max) {
		return text.length() > max ? text.substring(0, max) : text;
	}
}

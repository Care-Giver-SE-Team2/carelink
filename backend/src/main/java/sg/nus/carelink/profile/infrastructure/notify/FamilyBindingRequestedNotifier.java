package sg.nus.carelink.profile.infrastructure.notify;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import sg.nus.carelink.profile.application.FamilyBindingRequested;

/**
 * Tells a family member that an elder has asked to link with them, so the request does not wait
 * unseen until they happen to open Family bindings. The message links to the binding
 * (FAMILY_BINDING), which the inbox shows only to the family member it was sent to.
 *
 * <p>Runs after the request commits and writes on its own, so a failed notification never undoes
 * the elder's request; it is logged instead.
 */
@Component
class FamilyBindingRequestedNotifier {

	static final String EVENT = "FAMILY_BINDING_REQUESTED";
	static final String RESOURCE = "FAMILY_BINDING";

	private static final Logger log = LoggerFactory.getLogger(FamilyBindingRequestedNotifier.class);

	private final JdbcClient jdbc;
	private final Clock clock;

	FamilyBindingRequestedNotifier(JdbcClient jdbc, Clock clock) {
		this.jdbc = jdbc;
		this.clock = clock;
	}

	@TransactionalEventListener
	void onFamilyBindingRequested(FamilyBindingRequested event) {
		try {
			notifyFamilyMember(event);
		} catch (RuntimeException failure) {
			log.error("Could not tell family member {} about binding request {}", event.familyMemberId(),
					event.bindingId(), failure);
		}
	}

	private void notifyFamilyMember(FamilyBindingRequested event) {
		Long user = jdbc.sql("select user_id from family_member where id = :id").param("id", event.familyMemberId())
				.query(Long.class).optional().orElse(null);
		if (user == null) {
			return;
		}
		String elder = jdbc.sql("select full_name from elder where id = :id").param("id", event.elderId())
				.query(String.class).optional().orElse("An elder");
		String title = elder + " wants to link with you";
		String body = "Confirm or reject the request in Family bindings to start seeing their care.";
		jdbc.sql("""
				insert into notification
				(recipient_user_id,event_type,channel,title,body,resource_type,resource_id,status,created_at)
				values (:recipient,:event,'IN_APP',:title,:body,:type,:resource,'PENDING',:createdAt)
				""").param("recipient", user).param("event", EVENT)
				// Stamped from the application clock, as the other notifiers do, so the inbox orders it with them.
				.param("createdAt", Timestamp.valueOf(LocalDateTime.now(clock)))
				.param("title", clip(title, 150)).param("body", clip(body, 1000))
				.param("type", RESOURCE).param("resource", event.bindingId()).update();
	}

	private static String clip(String text, int max) {
		return text.length() > max ? text.substring(0, max) : text;
	}
}

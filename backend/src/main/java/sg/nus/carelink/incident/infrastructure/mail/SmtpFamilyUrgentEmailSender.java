package sg.nus.carelink.incident.infrastructure.mail;

import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import sg.nus.carelink.incident.application.FamilyUrgentEmailSender;
import sg.nus.carelink.incident.domain.model.FamilyAlertEvent;

/** No care description, location or authorization credential enters an email. @author Wang Zhili */
@Component
class SmtpFamilyUrgentEmailSender implements FamilyUrgentEmailSender {
	private final SmtpFamilyEmailTransport transport;
	private final String baseUrl;
	SmtpFamilyUrgentEmailSender(SmtpFamilyEmailTransport transport,
			@Value("${carelink.family-email.app-base-url:}") String baseUrl) {
		this.transport = transport; this.baseUrl = validBaseUrl(baseUrl);
	}
	@Override public boolean configured() { return transport.configured() && baseUrl != null; }
	@Override public void send(String address, FamilyAlertEvent event) {
		if (!configured()) { throw new IllegalStateException("Urgent email is unavailable"); }
		boolean unresolved = event.type() == FamilyAlertEvent.Type.INCIDENT_UNRESOLVED;
		transport.send(address, unresolved ? "CareLink urgent alert: incident not taken up" : "CareLink urgent care alert",
				(unresolved ? "The institution has not been able to assign a responder. Please contact it directly."
						: "A care incident has been reported for someone you follow.")
				+ "\n\nSign in to CareLink to view the details: " + baseUrl + "/family/incidents/" + event.incidentId()
				+ "\n\nReceiving this email does not mark the alert read or confirm that you know about it.");
	}
	private String validBaseUrl(String value) {
		try {
			var uri = URI.create(value);
			if (!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) || uri.getHost() == null
					|| uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null) { return null; }
			int end = value.length();
			while (value.charAt(end - 1) == '/') { end--; }
			return value.substring(0, end);
		} catch (IllegalArgumentException _) { return null; }
	}
}

package sg.nus.carelink.incident.infrastructure.mail;

import java.net.URI;
import jakarta.mail.MessagingException;
import jakarta.mail.SendFailedException;
import org.eclipse.angus.mail.smtp.SMTPAddressFailedException;
import org.eclipse.angus.mail.smtp.SMTPSendFailedException;
import org.springframework.mail.MailSendException;
import sg.nus.carelink.incident.application.FamilyEmailRejected;
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
		try { transport.send(address, unresolved ? "CareLink urgent alert: incident not taken up" : "CareLink urgent care alert",
				(unresolved ? "An alert was raised because a responder could not be assigned. Sign in for the current status or contact the institution."
						: "A care incident has been reported for someone you follow.")
				+ "\n\nSign in to CareLink to view the details: " + baseUrl + "/family/incidents/" + event.incidentId()
				+ "\n\nReceiving this email does not mark the alert read or confirm that you know about it.");
		} catch (MailSendException failure) {
			var rejected = rejection(failure);
			if (rejected != null) { throw rejected; }
			throw failure;
		}
	}
	private FamilyEmailRejected rejection(MailSendException failure) {
		for (var problem : failure.getFailedMessages().values()) {
			var rejected = negativeReply(problem);
			if (rejected != null) { return rejected; }
		}
		return null;
	}
	private FamilyEmailRejected negativeReply(Exception problem) {
		// One-recipient messages only. Any valid-sent address or missing/ambiguous reply remains UNKNOWN.
		for (Exception current = problem; current instanceof MessagingException mail; current = mail.getNextException()) {
			if (current instanceof SendFailedException sent && sent.getValidSentAddresses() != null && sent.getValidSentAddresses().length > 0) { return null; }
			FamilyEmailRejected rejected = null;
			if (current instanceof SMTPAddressFailedException address) { rejected = negativeReply(address.getCommand(), address.getReturnCode()); }
			else if (current instanceof SMTPSendFailedException message) { rejected = negativeReply(message.getCommand(), message.getReturnCode()); }
			if (rejected != null) { return rejected; }
		}
		return null;
	}
	private FamilyEmailRejected negativeReply(String command, int code) {
		if (command == null || code < 400 || code >= 600) { return null; }
		String verb = command.trim();
		boolean beforeAcceptance = verb.startsWith("RCPT TO:") || verb.startsWith("MAIL FROM:") || verb.equals("DATA") || verb.equals(".");
		return beforeAcceptance ? new FamilyEmailRejected(code < 500) : null;
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

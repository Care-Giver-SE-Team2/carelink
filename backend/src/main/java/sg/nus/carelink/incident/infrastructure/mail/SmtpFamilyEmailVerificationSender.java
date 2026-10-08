package sg.nus.carelink.incident.infrastructure.mail;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import sg.nus.carelink.incident.application.FamilyEmailVerificationSender;

/** Disabled until SMTP and a sender are configured; never logs the address or credential.
 * @author Wang Zhili
 */
@Component
public class SmtpFamilyEmailVerificationSender implements FamilyEmailVerificationSender {
	private final ObjectProvider<JavaMailSender> mail;
	private final boolean enabled;
	private final String from;
	public SmtpFamilyEmailVerificationSender(ObjectProvider<JavaMailSender> mail,
			@Value("${carelink.family-email.enabled:false}") boolean enabled,
			@Value("${carelink.family-email.from:}") String from) {
		this.mail = mail; this.enabled = enabled; this.from = from;
	}
	@Override public boolean configured() { return enabled && !from.isBlank() && mail.getIfAvailable() != null; }
	@Override public void send(String address, String token) {
		if (!configured()) { throw unavailable(); }
		var message = new SimpleMailMessage();
		message.setFrom(from); message.setTo(address);
		message.setSubject("Verify your CareLink notification email");
		message.setText("Enter this code on your signed-in CareLink notification email page within 15 minutes.\n\n"
				+ "Verification code: " + token + "\n\nIf you did not request this email, ignore it.");
		try { mail.getObject().send(message); }
		catch (MailException _) { throw unavailable(); }
	}
	private ResponseStatusException unavailable() {
		return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Verification email is unavailable. Please try again later.");
	}
}

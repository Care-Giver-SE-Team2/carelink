package sg.nus.carelink.incident.infrastructure.mail;

import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import sg.nus.carelink.incident.application.FamilyEmailVerificationSender;

/** Disabled until SMTP and a sender are configured; never logs the address or credential.
 * @author Wang Zhili
 */
@Component
public class SmtpFamilyEmailVerificationSender implements FamilyEmailVerificationSender {
	private final SmtpFamilyEmailTransport transport;
	public SmtpFamilyEmailVerificationSender(SmtpFamilyEmailTransport transport) { this.transport = transport; }
	@Override public boolean configured() { return transport.configured(); }
	@Override public void send(String address, String token) {
		if (!configured()) { throw unavailable(); }
		try {
			transport.send(address, "Verify your CareLink notification email",
					"Enter this code on your signed-in CareLink notification email page within 15 minutes.\n\n"
					+ "Verification code: " + token + "\n\nIf you did not request this email, ignore it.");
		} catch (MailException _) { throw unavailable(); }
	}
	private ResponseStatusException unavailable() {
		return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Verification email is unavailable. Please try again later.");
	}
}

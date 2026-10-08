package sg.nus.carelink.incident.infrastructure.mail;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/** Shared bounded SMTP transport; disabled unless explicitly configured. @author Wang Zhili */
@Component
class SmtpFamilyEmailTransport {
	private final ObjectProvider<JavaMailSender> mail;
	private final boolean enabled;
	private final String from;
	SmtpFamilyEmailTransport(ObjectProvider<JavaMailSender> mail,
			@Value("${carelink.family-email.enabled:false}") boolean enabled,
			@Value("${carelink.family-email.from:}") String from) {
		this.mail = mail; this.enabled = enabled; this.from = from;
	}
	boolean configured() { return enabled && !from.isBlank() && mail.getIfAvailable() != null; }
	void send(String address, String subject, String body) {
		if (!configured()) { throw new IllegalStateException("Family email is unavailable"); }
		var message = new SimpleMailMessage();
		message.setFrom(from); message.setTo(address); message.setSubject(subject); message.setText(body);
		mail.getObject().send(message);
	}
}

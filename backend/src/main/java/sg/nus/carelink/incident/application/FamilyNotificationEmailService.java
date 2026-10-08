package sg.nus.carelink.incident.application;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.HexFormat;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.nus.carelink.incident.domain.model.FamilyNotificationEmail;
import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.repository.FamilyNotificationEmailRepository;
import sg.nus.carelink.profile.application.FamilyIdentityQuery;

/** Session identity selects the contact; a caller can never select another family's record.
 * @author Wang Zhili
 */
@Service
public class FamilyNotificationEmailService {
	private final FamilyNotificationEmailRepository contacts;
	private final FamilyIdentityQuery identity;
	private final FamilyEmailVerificationSender sender;
	private final Clock clock;
	private final SecureRandom random = new SecureRandom();
	public FamilyNotificationEmailService(FamilyNotificationEmailRepository contacts, FamilyIdentityQuery identity,
			FamilyEmailVerificationSender sender, Clock clock) {
		this.contacts = contacts; this.identity = identity; this.sender = sender; this.clock = clock;
	}
	public boolean configured() { return sender.configured(); }
	@Transactional(readOnly = true)
	public FamilyNotificationEmail get(String username) { return contacts.find(identity.requireFamilyMemberId(username)); }
	@Transactional
	public FamilyNotificationEmail request(String username, String address) {
		var contact = contacts.lock(identity.requireFamilyMemberId(username));
		byte[] bytes = new byte[32]; random.nextBytes(bytes);
		String token = HexFormat.of().formatHex(bytes);
		var pending = contact.request(address, hash(token), now());
		contacts.save(pending);
		// SMTP has bounded timeouts. Failure rolls back the address change; no success is reported.
		// SMTP and MySQL are not atomic: a later commit failure can leave an unusable mailed code.
		sender.send(address, token);
		return pending;
	}
	@Transactional
	public FamilyNotificationEmail verify(String username, String token) {
		var contact = contacts.lock(identity.requireFamilyMemberId(username)).verify(hash(token), now());
		contacts.save(contact); return contact;
	}
	@Transactional
	public FamilyNotificationEmail remove(String username) {
		var contact = contacts.lock(identity.requireFamilyMemberId(username)).remove();
		contacts.save(contact); return contact;
	}
	private LocalDateTime now() { return LocalDateTime.now(clock.withZone(Incident.CARELINK_ZONE)).withNano(0); }
	private String hash(String token) {
		try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
		catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException("SHA-256 is required by Java", impossible); }
	}
}

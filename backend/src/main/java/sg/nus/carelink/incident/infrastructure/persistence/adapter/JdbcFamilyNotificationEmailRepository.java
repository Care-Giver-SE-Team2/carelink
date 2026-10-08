package sg.nus.carelink.incident.infrastructure.persistence.adapter;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import sg.nus.carelink.incident.domain.model.FamilyNotificationEmail;
import sg.nus.carelink.incident.domain.repository.FamilyNotificationEmailRepository;

/** Serializes changes for one family, including the first concurrent request. @author Wang Zhili */
@Repository
public class JdbcFamilyNotificationEmailRepository implements FamilyNotificationEmailRepository {
	private final JdbcTemplate jdbc;
	public JdbcFamilyNotificationEmailRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
	@Override public FamilyNotificationEmail find(Long familyId) { return select(familyId, ""); }
	@Override public FamilyNotificationEmail lock(Long familyId) {
		jdbc.update("INSERT INTO family_notification_email(family_member_id) VALUES (?) ON DUPLICATE KEY UPDATE family_member_id=family_member_id", familyId);
		return select(familyId, " FOR UPDATE");
	}
	private FamilyNotificationEmail select(Long familyId, String lock) {
		var rows = jdbc.query("SELECT * FROM family_notification_email WHERE family_member_id=?" + lock,
				(rs, row) -> contact(rs), familyId);
		return rows.isEmpty() ? FamilyNotificationEmail.empty(familyId) : rows.getFirst();
	}
	private FamilyNotificationEmail contact(ResultSet rs) throws SQLException {
		return new FamilyNotificationEmail(rs.getLong("family_member_id"), rs.getString("email"),
				rs.getObject("verified_at", LocalDateTime.class), rs.getString("token_hash"),
				rs.getObject("verification_expires_at", LocalDateTime.class), rs.getObject("requested_at", LocalDateTime.class));
	}
	@Override public void save(FamilyNotificationEmail contact) {
		jdbc.update("UPDATE family_notification_email SET email=?,verified_at=?,token_hash=?,verification_expires_at=?,requested_at=? WHERE family_member_id=?",
				contact.email(), contact.verifiedAt(), contact.tokenHash(), contact.verificationExpiresAt(), contact.requestedAt(), contact.familyMemberId());
	}
}

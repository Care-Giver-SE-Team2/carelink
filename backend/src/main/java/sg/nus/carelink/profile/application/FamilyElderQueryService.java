package sg.nus.carelink.profile.application;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Queries elder summaries within the current family's readable bindings.
 *
 * @author Wang Zhili
 */
@Service
@Transactional(readOnly = true)
public class FamilyElderQueryService {

	private final FamilyAccessQuery access;
	private final ProfileService profiles;
	private final Clock clock;

	public FamilyElderQueryService(FamilyAccessQuery access, ProfileService profiles, Clock clock) {
		this.access = access;
		this.profiles = profiles;
		this.clock = clock;
	}

	/**
	 * Lists elders covered by the authenticated family's current read permission.
	 *
	 * @param authenticatedUsername Username supplied by the authenticated session
	 * @return Readable elder summaries, or an empty list when no binding grants access
	 * @author Wang Zhili
	 */
	public List<ElderSummary> listForFamily(String authenticatedUsername) {
		var elderIds = access.readableElderIds(authenticatedUsername);
		LocalDate today = LocalDate.now(clock.withZone(ZoneId.of("Asia/Singapore")));
		return profiles.listEldersByIds(elderIds, today);
	}
}

package sg.nus.carelink.incident.infrastructure.duty;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Component;

import sg.nus.carelink.identity.application.IdentityService;
import sg.nus.carelink.identity.domain.model.AppUser;
import sg.nus.carelink.incident.domain.model.Responder;
import sg.nus.carelink.incident.domain.repository.DutyRoster;
import sg.nus.carelink.incident.infrastructure.config.EscalationProperties;
import sg.nus.carelink.shared.security.Role;

/**
 * Answers "who is on duty" from the accounts that exist, until CareLink has a real roster.
 *
 * <p><strong>This is a deliberate simplification, and the only one in the escalation
 * flow.</strong> The schema records who <em>is</em> a manager ({@code user_role}) but not
 * who is <em>on shift</em>; a duty table is Sprint 3 work. Until it exists, a manager
 * counts as on duty inside the configured shift window, and the one picked rotates by day
 * so that the same person is not first responder every single day.
 *
 * <p>Everything above this class is written against {@link DutyRoster}, so replacing this
 * with a table-backed implementation changes one file and no rules.
 */
@Component
class RoleBasedDutyRoster implements DutyRoster {

	private final IdentityService identity;
	private final EscalationProperties properties;

	RoleBasedDutyRoster(IdentityService identity, EscalationProperties properties) {
		this.identity = identity;
		this.properties = properties;
	}

	@Override
	public Optional<Responder> dutyManagerAt(LocalDateTime when) {
		if (!isWithinShift(when.toLocalTime())) {
			return Optional.empty();
		}
		List<Responder> managers = allManagers();
		if (managers.isEmpty()) {
			return Optional.empty();
		}
		int index = Math.floorMod(when.getDayOfYear(), managers.size());
		return Optional.of(managers.get(index));
	}

	@Override
	public List<Responder> allManagers() {
		return identity.enabledWithRole(Role.MANAGER).stream()
				.map(RoleBasedDutyRoster::toResponder)
				.toList();
	}

	@Override
	public Optional<Responder> responderById(Long userId) {
		if (userId == null) {
			return Optional.empty();
		}
		return identity.findById(userId).map(RoleBasedDutyRoster::toResponder);
	}

	/**
	 * A shift that ends before it starts is an overnight one, so the window wraps past
	 * midnight instead of matching nothing.
	 */
	private boolean isWithinShift(LocalTime time) {
		LocalTime start = properties.getDutyStart();
		LocalTime end = properties.getDutyEnd();
		if (start.equals(end)) {
			return true;
		}
		return start.isBefore(end)
				? !time.isBefore(start) && time.isBefore(end)
				: !time.isBefore(start) || time.isBefore(end);
	}

	private static Responder toResponder(AppUser user) {
		return new Responder(user.id(), user.displayName());
	}
}

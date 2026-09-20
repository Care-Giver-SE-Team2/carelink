package sg.nus.carelink.incident.support;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import sg.nus.carelink.incident.domain.model.Responder;
import sg.nus.carelink.incident.domain.repository.DutyRoster;

/**
 * A duty roster a test can state in one line.
 *
 * <p>This is the payoff of {@code DutyRoster} being an interface: the whole escalation
 * chain, including "nobody is on shift" and "every manager has already had it", is
 * exercised without a database, a container or a clock that really has to be 3 a.m.
 */
public final class FakeDutyRoster implements DutyRoster {

	private final List<Responder> managers = new ArrayList<>();
	private Responder onDuty;
	private LocalTime shiftStart = LocalTime.of(8, 0);
	private LocalTime shiftEnd = LocalTime.of(20, 0);

	public static FakeDutyRoster withManagers(Responder... responders) {
		FakeDutyRoster roster = new FakeDutyRoster();
		roster.managers.addAll(List.of(responders));
		if (responders.length > 0) {
			roster.onDuty = responders[0];
		}
		return roster;
	}

	/** Nobody at all: no managers, nobody on shift. Drives the "chain exhausted" branch. */
	public static FakeDutyRoster empty() {
		return new FakeDutyRoster();
	}

	public FakeDutyRoster onDuty(Responder responder) {
		this.onDuty = responder;
		return this;
	}

	/** Puts the institution out of hours, so the duty tier finds nobody. */
	public FakeDutyRoster outOfHours() {
		this.onDuty = null;
		this.shiftStart = LocalTime.MIDNIGHT;
		this.shiftEnd = LocalTime.MIDNIGHT.plusMinutes(1);
		return this;
	}

	@Override
	public Optional<Responder> dutyManagerAt(LocalDateTime when) {
		if (onDuty == null) {
			return Optional.empty();
		}
		LocalTime time = when.toLocalTime();
		boolean onShift = !time.isBefore(shiftStart) && time.isBefore(shiftEnd);
		return onShift ? Optional.of(onDuty) : Optional.empty();
	}

	@Override
	public List<Responder> allManagers() {
		return List.copyOf(managers);
	}

	@Override
	public Optional<Responder> responderById(Long userId) {
		return managers.stream().filter(manager -> manager.userId().equals(userId)).findFirst();
	}
}

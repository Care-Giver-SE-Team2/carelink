package sg.nus.carelink.incident.domain.service;

import java.util.Objects;
import java.util.Optional;

import sg.nus.carelink.incident.domain.model.EscalationTier;
import sg.nus.carelink.incident.domain.model.Responder;
import sg.nus.carelink.incident.domain.repository.DutyRoster;

/**
 * Third link: any enabled manager, on shift or not.
 *
 * <p>The safety net. It is what catches an incident raised at three in the morning, and
 * what catches the duty manager letting the countdown expire. It offers the first manager
 * who has not already held this incident, so an escalation always moves to somebody new.
 *
 * <p>If every manager has already had it, this link steps aside too and the terminal tier
 * takes over — which is the "升级链已用尽" branch.
 */
public final class AnyManagerHandler extends ChainedResponderHandler {

	private final DutyRoster roster;

	public AnyManagerHandler(DutyRoster roster, ResponderHandler next) {
		super(next);
		this.roster = Objects.requireNonNull(roster, "roster");
	}

	@Override
	public EscalationTier tier() {
		return EscalationTier.ANY_MANAGER;
	}

	@Override
	protected Optional<Responder> candidate(EscalationRequest request) {
		return roster.allManagers().stream()
				.filter(manager -> !request.hasAlreadyHeld(manager))
				.findFirst();
	}

	@Override
	protected String unavailableReason() {
		return "every manager has already held this incident";
	}
}

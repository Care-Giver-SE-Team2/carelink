package sg.nus.carelink.incident.domain.service;

import java.util.Objects;
import java.util.Optional;

import sg.nus.carelink.incident.domain.model.EscalationTier;
import sg.nus.carelink.incident.domain.model.Responder;
import sg.nus.carelink.incident.domain.repository.DutyRoster;

/**
 * Second link: the manager on shift at the moment the incident is routed.
 *
 * <p>This is the normal first responder for a new incident, and the reason the chain has to
 * be assembled at run time rather than written down — the answer changes with the hour.
 * Out of hours the roster has nobody and the link steps aside, which is exactly the
 * "跳过并继续向上，跳过原因留痕" branch of UC-SYS02.
 */
public final class DutyManagerHandler extends ChainedResponderHandler {

	private final DutyRoster roster;

	public DutyManagerHandler(DutyRoster roster, ResponderHandler next) {
		super(next);
		this.roster = Objects.requireNonNull(roster, "roster");
	}

	@Override
	public EscalationTier tier() {
		return EscalationTier.DUTY_MANAGER;
	}

	@Override
	protected Optional<Responder> candidate(EscalationRequest request) {
		return roster.dutyManagerAt(request.at());
	}

	@Override
	protected String unavailableReason() {
		return "no manager on shift at this hour";
	}
}

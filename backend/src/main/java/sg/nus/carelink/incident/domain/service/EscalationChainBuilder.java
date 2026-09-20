package sg.nus.carelink.incident.domain.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import sg.nus.carelink.incident.domain.model.EscalationChain;
import sg.nus.carelink.incident.domain.model.EscalationLevel;
import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.repository.DutyRoster;

/**
 * Assembles the escalation chain for one incident at one moment.
 *
 * <p>This is the Builder half of the design problem, and it exists because assembling the
 * chain and walking it change for different reasons. The walk is stable — offer it, take it
 * or pass it on — while the assembly rules are the part the institution rewrites: which
 * tiers a severity deserves, how long each level gets, whether the out-of-hours fallback
 * applies. Putting the rules in the handlers would mean every policy change edited the
 * handling logic; putting them here means the handlers never change.
 *
 * <p>The rule that varies the shape today: a LOW severity incident is not allowed to wake
 * every manager in the institution, so its chain stops after the duty manager. HIGH and
 * MEDIUM get the full fallback. Countdown lengths come from {@link EscalationPolicy}, which
 * is configuration rather than code.
 *
 * <p>Nothing here is persisted. Two calls a minute apart can legitimately produce different
 * chains if the roster changed, which is why the result carries the moment it was built.
 */
public final class EscalationChainBuilder {

	private final Incident incident;
	private LocalDateTime at;
	private EscalationPolicy policy = EscalationPolicy.defaults();
	private DutyRoster roster;

	private EscalationChainBuilder(Incident incident) {
		this.incident = Objects.requireNonNull(incident, "incident");
	}

	public static EscalationChainBuilder forIncident(Incident incident) {
		return new EscalationChainBuilder(incident);
	}

	public EscalationChainBuilder at(LocalDateTime moment) {
		this.at = Objects.requireNonNull(moment, "at");
		return this;
	}

	public EscalationChainBuilder withPolicy(EscalationPolicy escalationPolicy) {
		this.policy = Objects.requireNonNull(escalationPolicy, "policy");
		return this;
	}

	public EscalationChainBuilder from(DutyRoster dutyRoster) {
		this.roster = Objects.requireNonNull(dutyRoster, "roster");
		return this;
	}

	/** The head of the handler chain: what {@code handle} is called on. */
	public ResponderHandler build() {
		requireComplete();
		ResponderHandler chain = new FamilyEscalationHandler();
		for (TierFactory factory : tiersInReverseOrder()) {
			chain = factory.create(roster, chain);
		}
		return chain;
	}

	/**
	 * The same chain expressed as a plan a manager can read, for
	 * {@code GET /api/incidents/{id}/escalation-chain}.
	 */
	public EscalationChain describe() {
		requireComplete();
		List<EscalationLevel> levels = build().survey(EscalationRequest.routing(incident, at, policy));
		return new EscalationChain(incident.id(), at, incident.severity(), assemblyReason(), levels);
	}

	private void requireComplete() {
		Objects.requireNonNull(at, "at: the chain depends on the hour, so the moment is required");
		Objects.requireNonNull(roster, "roster: the chain depends on who is on shift");
	}

	/**
	 * Built back to front because each handler is constructed with its successor, which is
	 * what makes a link immutable and a chain safe to share between threads.
	 */
	private List<TierFactory> tiersInReverseOrder() {
		List<TierFactory> tiers = new ArrayList<>();
		if (incident.severity() != Incident.Severity.LOW) {
			tiers.add(AnyManagerHandler::new);
		}
		tiers.add(DutyManagerHandler::new);
		tiers.add(AssignedResponderHandler::new);
		return tiers;
	}

	private String assemblyReason() {
		return "severity %s, %s, %d manager(s) enabled".formatted(
				incident.severity(),
				roster.dutyManagerAt(at).isPresent() ? "duty manager on shift" : "out of hours",
				roster.allManagers().size());
	}

	/** Lets the tier list stay a list of constructors rather than a switch. */
	@FunctionalInterface
	private interface TierFactory {
		ResponderHandler create(DutyRoster roster, ResponderHandler next);
	}
}

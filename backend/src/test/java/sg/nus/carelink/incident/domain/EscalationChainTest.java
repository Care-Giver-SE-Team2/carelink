package sg.nus.carelink.incident.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.incident.domain.model.EscalationChain;
import sg.nus.carelink.incident.domain.model.EscalationLevel;
import sg.nus.carelink.incident.domain.model.EscalationTier;
import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.service.EscalationChainBuilder;
import sg.nus.carelink.incident.domain.service.EscalationOutcome;
import sg.nus.carelink.incident.domain.service.EscalationPolicy;
import sg.nus.carelink.incident.domain.service.EscalationRequest;
import sg.nus.carelink.incident.domain.service.ResponderHandler;
import sg.nus.carelink.incident.support.FakeDutyRoster;
import sg.nus.carelink.incident.support.IncidentFixtures;

/**
 * The design problem itself: who an incident is offered to, in what order, and what happens
 * when a level cannot take it.
 *
 * <p>These are the tests the report's Chain of Responsibility section argues from. Each one
 * states a rule from UC-MG05 or UC-SYS02 and checks the chain honours it, without a
 * database, a scheduler or a real clock.
 */
class EscalationChainTest {

	private static final EscalationPolicy POLICY = EscalationPolicy.defaults();

	// ------------------------------------------------------------------ assembly ---

	@Test
	void aHighSeverityChainOffersTheDutyManagerFirstAndKeepsAFallback() {
		FakeDutyRoster roster = FakeDutyRoster
				.withManagers(IncidentFixtures.ALICE, IncidentFixtures.BEN)
				.onDuty(IncidentFixtures.ALICE);

		EscalationChain chain = describe(IncidentFixtures.savedSos(1L), roster);

		assertThat(chain.levels()).extracting(EscalationLevel::tier).containsExactly(
				EscalationTier.ASSIGNED_RESPONDER,
				EscalationTier.DUTY_MANAGER,
				EscalationTier.ANY_MANAGER,
				EscalationTier.FAMILY_ESCALATION);
	}

	@Test
	void aLowSeverityIncidentDoesNotWakeEveryManager() {
		FakeDutyRoster roster = FakeDutyRoster
				.withManagers(IncidentFixtures.ALICE, IncidentFixtures.BEN)
				.onDuty(IncidentFixtures.ALICE);

		EscalationChain chain = describe(
				IncidentFixtures.savedWithSeverity(1L, Incident.Severity.LOW), roster);

		assertThat(chain.levels()).extracting(EscalationLevel::tier)
				.doesNotContain(EscalationTier.ANY_MANAGER)
				.endsWith(EscalationTier.FAMILY_ESCALATION);
	}

	@Test
	void theChainAlwaysEndsWithTheTerminalTier() {
		EscalationChain chain = describe(IncidentFixtures.savedSos(1L), FakeDutyRoster.empty());

		assertThat(chain.terminalLevel().tier()).isEqualTo(EscalationTier.FAMILY_ESCALATION);
		assertThat(chain.terminalLevel().isFillable()).isFalse();
	}

	@Test
	void theChainRecordsWhatItWasAssembledFrom() {
		FakeDutyRoster roster = FakeDutyRoster.withManagers(IncidentFixtures.ALICE);

		EscalationChain chain = describe(IncidentFixtures.savedSos(1L), roster);

		assertThat(chain.assembledFrom()).contains("HIGH").contains("duty manager on shift");
		assertThat(chain.assembledAt()).isEqualTo(IncidentFixtures.DURING_SHIFT);
	}

	@Test
	void oneManagerWhoQualifiesForTwoTiersIsListedOnlyOnce() {
		FakeDutyRoster roster = FakeDutyRoster.withManagers(IncidentFixtures.ALICE);

		EscalationChain chain = describe(IncidentFixtures.savedSos(1L), roster);

		assertThat(chain.levels())
				.filteredOn(EscalationLevel::isFillable)
				.extracting(EscalationLevel::responderUserId)
				.containsExactly(IncidentFixtures.ALICE.userId());
	}

	// ------------------------------------------------------------------- routing ---

	@Test
	void aNewIncidentGoesToTheManagerOnShift() {
		FakeDutyRoster roster = FakeDutyRoster
				.withManagers(IncidentFixtures.ALICE, IncidentFixtures.BEN)
				.onDuty(IncidentFixtures.BEN);

		EscalationOutcome outcome = route(IncidentFixtures.savedSos(1L), roster);

		assertThat(outcome.assigned()).isTrue();
		assertThat(outcome.tier()).isEqualTo(EscalationTier.DUTY_MANAGER);
		assertThat(outcome.responder()).isEqualTo(IncidentFixtures.BEN);
	}

	@Test
	void outOfHoursTheDutyTierStepsAsideAndSaysWhy() {
		FakeDutyRoster roster = FakeDutyRoster
				.withManagers(IncidentFixtures.ALICE)
				.outOfHours();

		EscalationOutcome outcome = route(IncidentFixtures.savedSos(1L), roster);

		assertThat(outcome.assigned()).isTrue();
		assertThat(outcome.tier()).isEqualTo(EscalationTier.ANY_MANAGER);
		assertThat(outcome.skipped())
				.extracting(EscalationRequest.SkippedTier::tier)
				.contains(EscalationTier.DUTY_MANAGER);
		assertThat(outcome.describeRoute()).contains("no manager on shift");
	}

	@Test
	void theFirstLevelsCountdownComesFromTheSeverity() {
		FakeDutyRoster roster = FakeDutyRoster.withManagers(IncidentFixtures.ALICE);

		EscalationOutcome high = route(IncidentFixtures.savedSos(1L), roster);
		EscalationOutcome low = route(
				IncidentFixtures.savedWithSeverity(2L, Incident.Severity.LOW), roster);

		assertThat(high.countdown()).isEqualTo(Duration.ofMinutes(5));
		assertThat(low.countdown()).isEqualTo(Duration.ofMinutes(60));
	}

	@Test
	void aResponderReachedAfterSomebodyTimedOutGetsLongerThanTheFirstDid() {
		FakeDutyRoster roster = FakeDutyRoster
				.withManagers(IncidentFixtures.ALICE, IncidentFixtures.BEN)
				.onDuty(IncidentFixtures.ALICE);
		Incident incident = IncidentFixtures.savedSos(1L);

		EscalationOutcome outcome = chain(incident, roster).handle(EscalationRequest.afterTimeout(
				incident, IncidentFixtures.DURING_SHIFT, POLICY, Set.of(IncidentFixtures.ALICE.userId())));

		assertThat(outcome.responder()).isEqualTo(IncidentFixtures.BEN);
		assertThat(outcome.countdown()).isEqualTo(Duration.ofMinutes(10));
	}

	@Test
	void steppingOverATierNobodyFillsDoesNotExtendTheNextDeadline() {
		FakeDutyRoster roster = FakeDutyRoster
				.withManagers(IncidentFixtures.ALICE)
				.outOfHours();

		EscalationOutcome outcome = route(IncidentFixtures.savedSos(1L), roster);

		assertThat(outcome.tier()).isEqualTo(EscalationTier.ANY_MANAGER);
		assertThat(outcome.countdown()).isEqualTo(Duration.ofMinutes(5));
	}

	// ----------------------------------------------------------------- escalating ---

	@Test
	void anEscalationDoesNotHandTheIncidentBackToWhoeverJustTimedOut() {
		FakeDutyRoster roster = FakeDutyRoster
				.withManagers(IncidentFixtures.ALICE, IncidentFixtures.BEN)
				.onDuty(IncidentFixtures.ALICE);
		Incident timedOut = IncidentFixtures.savedSos(1L)
				.assignTo(IncidentFixtures.ALICE.userId(), IncidentFixtures.DURING_SHIFT.plusMinutes(5));

		EscalationOutcome outcome = chain(timedOut, roster).handle(EscalationRequest.afterTimeout(
				timedOut, IncidentFixtures.DURING_SHIFT.plusMinutes(6), POLICY,
				Set.of(IncidentFixtures.ALICE.userId())));

		assertThat(outcome.assigned()).isTrue();
		assertThat(outcome.responder()).isEqualTo(IncidentFixtures.BEN);
	}

	@Test
	void theResponderAlreadyNamedKeepsTheIncidentWhenTheChainIsMerelyRebuilt() {
		FakeDutyRoster roster = FakeDutyRoster
				.withManagers(IncidentFixtures.ALICE, IncidentFixtures.BEN)
				.onDuty(IncidentFixtures.BEN);
		Incident held = IncidentFixtures.savedSos(1L)
				.assignTo(IncidentFixtures.ALICE.userId(), IncidentFixtures.DURING_SHIFT.plusMinutes(5));

		EscalationOutcome outcome = route(held, roster);

		assertThat(outcome.tier()).isEqualTo(EscalationTier.ASSIGNED_RESPONDER);
		assertThat(outcome.responder()).isEqualTo(IncidentFixtures.ALICE);
	}

	@Test
	void whenEveryManagerHasAlreadyHeldItTheChainIsExhausted() {
		FakeDutyRoster roster = FakeDutyRoster
				.withManagers(IncidentFixtures.ALICE, IncidentFixtures.BEN)
				.onDuty(IncidentFixtures.ALICE);
		Incident incident = IncidentFixtures.savedSos(1L);

		EscalationOutcome outcome = chain(incident, roster).handle(EscalationRequest.afterTimeout(
				incident, IncidentFixtures.DURING_SHIFT, POLICY,
				Set.of(IncidentFixtures.ALICE.userId(), IncidentFixtures.BEN.userId())));

		assertThat(outcome.assigned()).isFalse();
		assertThat(outcome.tier()).isEqualTo(EscalationTier.FAMILY_ESCALATION);
		assertThat(outcome.describeRoute()).startsWith("chain exhausted");
	}

	@Test
	void anInstitutionWithNoManagersAtAllExhaustsImmediately() {
		EscalationOutcome outcome = route(IncidentFixtures.savedSos(1L), FakeDutyRoster.empty());

		assertThat(outcome.assigned()).isFalse();
		assertThat(outcome.skipped()).hasSize(3);
	}

	// --------------------------------------------------------------- value objects ---

	@Test
	void aChainWithoutLevelsIsNotAChain() {
		assertThatThrownBy(() -> new EscalationChain(
				1L, IncidentFixtures.DURING_SHIFT, Incident.Severity.HIGH, "none", List.of()))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void aLevelKnowsWhetherAnybodyFillsIt() {
		EscalationLevel filled = EscalationLevel.pending(
				1, EscalationTier.DUTY_MANAGER, IncidentFixtures.ALICE, Duration.ofMinutes(5));
		EscalationLevel empty = EscalationLevel.skipped(
				2, EscalationTier.ANY_MANAGER, Duration.ofMinutes(10));

		assertThat(filled.isFillable()).isTrue();
		assertThat(filled.responderUserId()).isEqualTo(IncidentFixtures.ALICE.userId());
		assertThat(empty.isFillable()).isFalse();
		assertThat(empty.responderUserId()).isNull();
		assertThat(empty.state()).isEqualTo(EscalationLevel.State.SKIPPED_OFF_DUTY);
	}

	@Test
	void takingALevelCurrentFixesItsDeadline() {
		EscalationLevel current = EscalationLevel
				.pending(1, EscalationTier.DUTY_MANAGER, IncidentFixtures.ALICE, Duration.ofMinutes(5))
				.takeCurrentFrom(IncidentFixtures.DURING_SHIFT);

		assertThat(current.state()).isEqualTo(EscalationLevel.State.CURRENT);
		assertThat(current.respondBy()).isEqualTo(IncidentFixtures.DURING_SHIFT.plusMinutes(5));
		assertThat(current.timedOut().state()).isEqualTo(EscalationLevel.State.TIMED_OUT);
		assertThat(current.claimed().state()).isEqualTo(EscalationLevel.State.CLAIMED);
	}

	@Test
	void aLevelPositionStartsAtOne() {
		assertThatThrownBy(() -> EscalationLevel.pending(
				0, EscalationTier.DUTY_MANAGER, IncidentFixtures.ALICE, Duration.ZERO))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void theChainCanReportWhatComesAfterALevelAndWhenItIsSpent() {
		FakeDutyRoster roster = FakeDutyRoster.withManagers(IncidentFixtures.ALICE);
		EscalationChain chain = describe(IncidentFixtures.savedSos(1L), roster);
		EscalationLevel first = chain.levels().get(0);

		assertThat(chain.size()).isEqualTo(4);
		assertThat(chain.after(first)).isPresent();
		assertThat(chain.isExhaustedFrom(chain.size() + 1)).isTrue();
		assertThat(chain.current()).isEmpty();
		assertThat(chain.with(first.claimed()).levels().get(0).state())
				.isEqualTo(EscalationLevel.State.CLAIMED);
	}

	@Test
	void aTierKnowsWhetherItIsTheLastOne() {
		assertThat(EscalationTier.FAMILY_ESCALATION.isTerminal()).isTrue();
		assertThat(EscalationTier.DUTY_MANAGER.isTerminal()).isFalse();
		assertThat(EscalationTier.DUTY_MANAGER.label()).isEqualTo("Duty manager");
	}

	// -------------------------------------------------------------------- helpers ---

	private static ResponderHandler chain(Incident incident, FakeDutyRoster roster) {
		return EscalationChainBuilder.forIncident(incident)
				.at(IncidentFixtures.DURING_SHIFT)
				.withPolicy(POLICY)
				.from(roster)
				.build();
	}

	private static EscalationOutcome route(Incident incident, FakeDutyRoster roster) {
		return chain(incident, roster)
				.handle(EscalationRequest.routing(incident, IncidentFixtures.DURING_SHIFT, POLICY));
	}

	private static EscalationChain describe(Incident incident, FakeDutyRoster roster) {
		return EscalationChainBuilder.forIncident(incident)
				.at(IncidentFixtures.DURING_SHIFT)
				.withPolicy(POLICY)
				.from(roster)
				.describe();
	}
}

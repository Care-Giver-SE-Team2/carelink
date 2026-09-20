package sg.nus.carelink.incident.support;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;

import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.model.Responder;

/** Named values the escalation tests share, so each test states only what it is about. */
public final class IncidentFixtures {

	public static final ZoneId ZONE = Incident.CARELINK_ZONE;

	/** A Wednesday afternoon: inside every shift window the tests use. */
	public static final LocalDateTime DURING_SHIFT = LocalDateTime.of(2026, 9, 16, 14, 30);

	/** The small hours: outside every shift window the tests use. */
	public static final LocalDateTime AT_NIGHT = LocalDateTime.of(2026, 9, 16, 3, 15);

	public static final Responder ALICE = new Responder(11L, "Alice Tan");
	public static final Responder BEN = new Responder(12L, "Ben Lim");
	public static final Responder CARA = new Responder(13L, "Cara Ong");

	private IncidentFixtures() {
	}

	/** A clock frozen at one moment, so a countdown can be stepped over without waiting. */
	public static Clock clockAt(LocalDateTime moment) {
		return Clock.fixed(moment.atZone(ZONE).toInstant(), ZONE);
	}

	/** An unrouted incident, exactly as it comes out of the factory. */
	public static Incident newSos() {
		return Incident.createElderSos(7L, 99L, null, null, "Blk 123 #04-56", "fell in the bathroom");
	}

	/** A saved, unrouted incident: it has an id but no responder and no deadline yet. */
	public static Incident savedSos(Long id) {
		return withId(newSos(), id);
	}

	public static Incident withId(Incident incident, Long id) {
		return new Incident(
				id,
				incident.elderId(),
				incident.visitId(),
				incident.reportedByUserId(),
				incident.responderUserId(),
				incident.source(),
				incident.category(),
				incident.severity(),
				incident.status(),
				incident.latitude(),
				incident.longitude(),
				incident.locationText(),
				incident.description(),
				incident.respondBy(),
				incident.reportedAt(),
				incident.resolvedAt());
	}

	/** An incident of a chosen severity, already saved and still unrouted. */
	public static Incident savedWithSeverity(Long id, Incident.Severity severity) {
		Incident base = savedSos(id);
		return new Incident(
				base.id(), base.elderId(), base.visitId(), base.reportedByUserId(), base.responderUserId(),
				base.source(), base.category(), severity, base.status(), base.latitude(), base.longitude(),
				base.locationText(), base.description(), base.respondBy(), base.reportedAt(), base.resolvedAt());
	}
}

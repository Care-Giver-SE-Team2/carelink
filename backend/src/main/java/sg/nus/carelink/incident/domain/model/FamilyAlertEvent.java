package sg.nus.carelink.incident.domain.model;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.UUID;

/** Stable care facts shared with incident observers. @author Wang Zhili */
public record FamilyAlertEvent(UUID eventId, Type type, Long incidentId, Long elderId, OffsetDateTime occurredAt, Long familyMemberId) {

	public enum Type { INCIDENT_RAISED, INCIDENT_UNRESOLVED, INCIDENT_ACKNOWLEDGEMENT_DUE }

	public FamilyAlertEvent(UUID eventId, Type type, Long incidentId, Long elderId, OffsetDateTime occurredAt) {
		this(eventId, type, incidentId, elderId, occurredAt, null);
	}

	/** One stable reminder fact per incident/family; retries and restarts reuse its identity. */
	public static FamilyAlertEvent acknowledgementDue(Long incidentId, Long elderId, Long familyId, OffsetDateTime deadline) {
		var id = UUID.nameUUIDFromBytes(("FM05:ACKNOWLEDGEMENT_DUE:" + incidentId + ":" + familyId).getBytes(StandardCharsets.UTF_8));
		return new FamilyAlertEvent(id, Type.INCIDENT_ACKNOWLEDGEMENT_DUE, incidentId, elderId, deadline, familyId);
	}

	public FamilyAlertEvent {
		Objects.requireNonNull(eventId, "eventId");
		Objects.requireNonNull(type, "type");
		if (incidentId == null || incidentId <= 0 || elderId == null || elderId <= 0) {
			throw new IllegalArgumentException("Positive incident and elder identifiers are required");
		}
		if (type == Type.INCIDENT_ACKNOWLEDGEMENT_DUE ? familyMemberId == null || familyMemberId <= 0 : familyMemberId != null) {
			throw new IllegalArgumentException("Only a reminder event requires a positive target family identifier");
		}
		occurredAt = Objects.requireNonNull(occurredAt, "occurredAt")
				.withOffsetSameInstant(ZoneOffset.ofHours(8)).truncatedTo(ChronoUnit.MICROS);
	}
}

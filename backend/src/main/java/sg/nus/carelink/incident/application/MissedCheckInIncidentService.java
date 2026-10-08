package sg.nus.carelink.incident.application;

import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.domain.model.IncidentLog;
import sg.nus.carelink.incident.domain.repository.IncidentLogRepository;
import sg.nus.carelink.incident.domain.repository.IncidentRepository;

@Service
class MissedCheckInIncidentService implements MissedCheckInIncidentGateway {
    private final IncidentRepository incidents;
    private final IncidentLogRepository timeline;
    private final EscalationService escalation;
    MissedCheckInIncidentService(IncidentRepository incidents, IncidentLogRepository timeline, EscalationService escalation) {
        this.incidents = incidents; this.timeline = timeline; this.escalation = escalation;
    }
    @Override @Transactional(propagation = Propagation.MANDATORY)
    public Long raise(Long elderId, Long visitId, LocalDateTime dueAt, LocalDateTime observedAt) {
        var incident = incidents.save(Incident.raisedForMissedCheckIn(elderId, visitId, dueAt, observedAt));
        timeline.save(IncidentLog.entry(incident.id(), "system", IncidentLog.Action.REPORTED,
                "assigned caregiver has not checked in after the allowed lateness threshold", observedAt));
        return escalation.routeNewIncident(incident).id();
    }
}

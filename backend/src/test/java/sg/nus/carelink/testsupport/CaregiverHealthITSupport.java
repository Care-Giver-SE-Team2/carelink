package sg.nus.carelink.testsupport;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;

/** Positive fixtures are produced through manager plan publication and caregiver check-in. */
@Import(CaregiverExecutionClock.class)
public abstract class CaregiverHealthITSupport extends CaregiverHttpITSupport {
    @Autowired protected Clock businessClock;
    protected long plannedVisit() throws Exception {
        // Plans start visits on the hour or half hour: the next one, so check-in (open 30 minutes early) is open now.
        var next = LocalDateTime.now(businessClock).withSecond(0).withNano(0).plusMinutes(1);
        var start = next.plusMinutes(Math.floorMod(-next.getMinute(), 30));
        try (var mgr = browser(managerName)) {
            body(mgr.put("/api/elders/" + elder + "/primary-caregiver", Map.of("caregiverId", caregiver)), 200);
            long plan = body(mgr.post("/api/care-plans", Map.of("elderId", elder)), 201).path("id").asLong();
            body(mgr.post("/api/care-plans/" + plan + "/publish", Map.of("startDate", start.toLocalDate().toString(), "nodes", List.of(Map.of(
                    "groupName", "Personal care", "name", "Care routine", "evidenceType", "NONE", "visits", List.of(Map.of(
                    "day", start.getDayOfWeek().name(), "startTime", start.toLocalTime().toString(), "minutes", 60)))))), 200);
            return jdbc.queryForObject("select id from visit where care_plan_id=? and scheduled_start=?", Long.class, plan, Timestamp.valueOf(start));
        }
    }
    protected void checkIn(Browser browser, long id) throws Exception {
        body(browser.post("/api/visits/" + id + "/check-in", Map.of("expectedVersion", 0, "clientRequestId", UUID.randomUUID().toString())), 200);
    }
    protected Map<String, Object> health(int version) {
        return new HashMap<>(Map.of("expectedVersion", version, "clientRequestId", UUID.randomUUID().toString(),
                "systolic", 123, "diastolic", 81, "pulse", 73, "temperature", 36.7, "healthFlag", "ATTENTION", "healthNote", "Synthetic caregiver observation"));
    }
    protected String path(long id) { return "/api/visits/" + id + "/health-records"; }
    protected long count(String table, long id) {
        // Fixture-only table names, never input from HTTP requests.
        return jdbc.queryForObject("select count(*) from " + table + " where visit_id=?", Long.class, id);
    }
}

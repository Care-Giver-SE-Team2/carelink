package sg.nus.carelink.report.infrastructure;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import sg.nus.carelink.report.application.ValueAddedManagerAlert;

/** Inserts in-app manager-bell notifications in the same transaction as approval. */
@Component
public class NotificationTableValueAddedManagerAlert implements ValueAddedManagerAlert {
    private final JdbcClient jdbc;

    public NotificationTableValueAddedManagerAlert(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void approved(Long visitId, Long elderId, String serviceName, LocalDateTime start, Long caregiverId) {
        List<Long> managers = jdbc.sql("""
                select distinct u.id from app_user u
                join user_role r on r.user_id = u.id
                where r.role = 'MANAGER' and u.enabled = true
                """).query(Long.class).list();
        String title = caregiverId == null ? "Extra service needs caregiver assignment"
                : "Extra service approved and assigned";
        String body = "Elder " + elderId + ": " + serviceName + " at " + start
                + (caregiverId == null ? ". No eligible primary caregiver; assign in the roster."
                        : ". Primary caregiver " + caregiverId + " assigned. Review in the roster.");
        for (Long managerId : managers) {
            jdbc.sql("""
                    insert into notification
                    (recipient_user_id,event_type,channel,title,body,resource_type,resource_id,status,created_at)
                    values (:recipient,'VALUE_ADDED_APPROVED','IN_APP',:title,:body,'VISIT',:visit,'PENDING',CURRENT_TIMESTAMP)
                    """).param("recipient", managerId).param("title", title)
                    .param("body", body.length() > 1000 ? body.substring(0, 1000) : body)
                    .param("visit", visitId).update();
        }
    }
}

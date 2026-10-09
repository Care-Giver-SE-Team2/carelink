package sg.nus.carelink.report.infrastructure;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;

class NotificationTableValueAddedManagerAlertTest {
    private static final LocalDateTime START = LocalDateTime.of(2026, 10, 24, 10, 0);
    private JdbcClient jdbc;
    private JdbcClient.StatementSpec statement;
    private JdbcClient.MappedQuerySpec<Long> managersQuery;
    private NotificationTableValueAddedManagerAlert alert;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcClient.class);
        statement = mock(JdbcClient.StatementSpec.class, RETURNS_SELF);
        managersQuery = mock(JdbcClient.MappedQuerySpec.class);
        when(jdbc.sql(anyString())).thenReturn(statement);
        when(statement.query(Long.class)).thenReturn(managersQuery);
        alert = new NotificationTableValueAddedManagerAlert(jdbc);
    }

    @Test
    void assignedCaregiverSendsSuccessNotificationToManager() {
        when(managersQuery.list()).thenReturn(List.of(4L));
        alert.approved(14L, 1L, "Hospital escort", START, 7L);
        verify(statement).param("recipient", 4L);
        verify(statement).param("title", "Extra service approved and assigned");
        verify(statement).param("body", "Elder 1: Hospital escort at 2026-10-24T10:00. Primary caregiver 7 assigned. Review in the roster.");
        verify(statement).param("visit", 14L);
        verify(statement).update();
    }

    @Test
    void unassignedVisitSendsActionRequiredNotification() {
        when(managersQuery.list()).thenReturn(List.of(4L));
        alert.approved(14L, 1L, "Grocery assistance", START, null);
        verify(statement).param("title", "Extra service needs caregiver assignment");
        verify(statement).param("body", "Elder 1: Grocery assistance at 2026-10-24T10:00. No eligible primary caregiver; assign in the roster.");
        verify(statement).param("visit", 14L);
        verify(statement).update();
    }

    @Test
    void notifiesEveryEnabledManagerReturnedByQuery() {
        when(managersQuery.list()).thenReturn(List.of(4L, 8L, 12L));
        alert.approved(14L, 1L, "Hospital escort", START, 7L);
        verify(statement).param("recipient", 4L);
        verify(statement).param("recipient", 8L);
        verify(statement).param("recipient", 12L);
        verify(statement, times(3)).update();
    }

    @Test
    void noManagersDoesNotInsertNotifications() {
        when(managersQuery.list()).thenReturn(List.of());
        alert.approved(14L, 1L, "Hospital escort", START, null);
        verify(statement, never()).update();
    }
}

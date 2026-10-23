package sg.nus.carelink.profile.infrastructure.notify;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.RETURNS_SELF;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;

import sg.nus.carelink.profile.application.FamilyAlertRecipients;
import sg.nus.carelink.profile.application.ServiceApplicationDeclined;
import sg.nus.carelink.profile.application.ServiceApplicationSubmitted;

class ServiceApplicationNotifierTest {

    private JdbcClient jdbc;
    private JdbcClient.StatementSpec statement;
    private JdbcClient.MappedQuerySpec<Long> managers;
    private final FamilyAlertRecipients families = mock(FamilyAlertRecipients.class);
    private ServiceApplicationNotifier notifier;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcClient.class);
        statement = mock(JdbcClient.StatementSpec.class, RETURNS_SELF);
        JdbcClient.MappedQuerySpec<String> names = mock(JdbcClient.MappedQuerySpec.class);
        managers = mock(JdbcClient.MappedQuerySpec.class);
        when(jdbc.sql(anyString())).thenReturn(statement);
        when(statement.query(String.class)).thenReturn(names);
        when(statement.query(Long.class)).thenReturn(managers);
        when(names.optional()).thenReturn(Optional.of("Tan Ah Kow"));
        when(managers.list()).thenReturn(List.of(3L, 4L));
        Clock clock = Clock.fixed(Instant.parse("2026-10-15T02:00:00Z"), ZoneId.of("Asia/Singapore"));
        notifier = new ServiceApplicationNotifier(jdbc, families, clock);
    }

    @Test
    void everyManagerIsToldOfANewApplicationAndTheMessageLinksToIt() {
        notifier.onSubmitted(new ServiceApplicationSubmitted(12L, 1L, 2));

        verify(statement).param("recipient", 3L);
        verify(statement).param("recipient", 4L);
        verify(statement, times(2)).param("event", "SERVICE_APPLICATION_SUBMITTED");
        verify(statement, times(2)).param("type", "SERVICE_APPLICATION");
        verify(statement, times(2)).param("resource", 12L);
        verify(statement, times(2)).param("title", "New service application for Tan Ah Kow");
        verify(statement, times(2)).param("body",
                "The family asked for 2 care services. Plan it or decline it on Tan Ah Kow's care plan.");
        verify(statement, times(2)).update();
    }

    @Test
    void theApplicantIsToldOfADeclineWithTheReason() {
        when(families.resolve(1L, 42L)).thenReturn(new FamilyAlertRecipients.Candidate(42L, 20L, null));

        notifier.onDeclined(new ServiceApplicationDeclined(12L, 1L, 42L, "No coach in your sector yet", false));

        verify(statement).param("recipient", 20L);
        verify(statement).param("event", "SERVICE_APPLICATION_DECLINED");
        verify(statement).param("type", "SERVICE_APPLICATION");
        verify(statement).param("resource", 12L);
        verify(statement).param("title", "Service application for Tan Ah Kow declined");
        verify(statement).param("body",
                "The care team could not add what you asked for to the care plan. Reason: No coach in your sector yet");
        verify(statement).update();
    }

    @Test
    void aDeclineAfterSomeOfItWasPlannedSaysSo() {
        when(families.resolve(1L, 42L)).thenReturn(new FamilyAlertRecipients.Candidate(42L, 20L, null));

        notifier.onDeclined(new ServiceApplicationDeclined(12L, 1L, 42L, "No coach in your sector yet", true));

        verify(statement).param("title", "Service application for Tan Ah Kow partly declined");
        verify(statement).param("body", "Some of what you asked for is in the care plan; the care team could not add "
                + "the rest. Reason: No coach in your sector yet");
    }

    @Test
    void anApplicantNoLongerBoundToTheElderIsNotWrittenTo() {
        when(families.resolve(1L, 42L)).thenReturn(new FamilyAlertRecipients.Candidate(42L, 20L, "BINDING_REVOKED"));

        notifier.onDeclined(new ServiceApplicationDeclined(12L, 1L, 42L, "Reason", false));

        verify(statement, never()).update();
    }

    @Test
    void aFailedWriteDoesNotEscapeTheListener() {
        when(statement.update()).thenThrow(new IllegalStateException("database down"));

        notifier.onSubmitted(new ServiceApplicationSubmitted(12L, 1L, 1));
    }
}

package sg.nus.carelink.profile.infrastructure.notify;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.RETURNS_SELF;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;

import sg.nus.carelink.profile.application.FamilyBindingRequested;

class FamilyBindingRequestedNotifierTest {

    private JdbcClient jdbc;
    private JdbcClient.StatementSpec statement;
    private JdbcClient.MappedQuerySpec<String> names;
    private JdbcClient.MappedQuerySpec<Long> users;
    private FamilyBindingRequestedNotifier notifier;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        jdbc = mock(JdbcClient.class);
        statement = mock(JdbcClient.StatementSpec.class, RETURNS_SELF);
        names = mock(JdbcClient.MappedQuerySpec.class);
        users = mock(JdbcClient.MappedQuerySpec.class);
        when(jdbc.sql(anyString())).thenReturn(statement);
        when(statement.query(String.class)).thenReturn(names);
        when(statement.query(Long.class)).thenReturn(users);
        when(names.optional()).thenReturn(Optional.of("Tan Ah Kow"));
        when(users.optional()).thenReturn(Optional.of(20L));
        Clock clock = Clock.fixed(Instant.parse("2026-10-15T02:00:00Z"), ZoneId.of("Asia/Singapore"));
        notifier = new FamilyBindingRequestedNotifier(jdbc, clock);
    }

    @Test
    void theFamilyMemberAskedIsToldAndTheMessageLinksToTheBinding() {
        notifier.onFamilyBindingRequested(new FamilyBindingRequested(10L, 1L, 3L));

        verify(statement).param("recipient", 20L);
        verify(statement).param("event", "FAMILY_BINDING_REQUESTED");
        verify(statement).param("type", "FAMILY_BINDING");
        verify(statement).param("resource", 10L);
        verify(statement).param("title", "Tan Ah Kow wants to link with you");
        verify(statement).update();
    }

    @Test
    void aFamilyMemberWithNoAccountIsNotWrittenTo() {
        when(users.optional()).thenReturn(Optional.empty());

        notifier.onFamilyBindingRequested(new FamilyBindingRequested(10L, 1L, 3L));

        verify(statement, never()).update();
    }

    @Test
    void aFailedWriteDoesNotEscapeTheListener() {
        when(statement.update()).thenThrow(new IllegalStateException("database down"));

        notifier.onFamilyBindingRequested(new FamilyBindingRequested(10L, 1L, 3L));
    }
}

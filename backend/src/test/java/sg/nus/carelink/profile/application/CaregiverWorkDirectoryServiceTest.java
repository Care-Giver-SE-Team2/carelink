package sg.nus.carelink.profile.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import sg.nus.carelink.identity.application.UserDirectory;
import sg.nus.carelink.profile.domain.model.*;
import sg.nus.carelink.profile.domain.repository.*;

class CaregiverWorkDirectoryServiceTest {
    final UserDirectory users = mock(UserDirectory.class);
    final CaregiverRepository caregivers = mock(CaregiverRepository.class);
    final ElderRepository elders = mock(ElderRepository.class);
    final CredentialRepository credentials = mock(CredentialRepository.class);
    final CredentialTypeRepository types = mock(CredentialTypeRepository.class);
    final CaregiverWorkDirectoryService service = new CaregiverWorkDirectoryService(users,caregivers,elders,credentials,types,30);
    final LocalDate day = LocalDate.of(2026,9,24);
    Credential credential(long id, int offset, Credential.Status status) {
        var c = mock(Credential.class);
        when(c.id()).thenReturn(id);
        when(c.expiryDate()).thenReturn(day.plusDays(offset));
        when(c.status()).thenReturn(status);
        return c;
    }
    @Test void warningsUseInclusiveWindowAndExcludeRejectedPendingAndRevoked() {
        var rows = List.of(
            credential(1,-1,Credential.Status.PUBLISHED),credential(2,0,Credential.Status.PUBLISHED),
            credential(3,30,Credential.Status.PUBLISHED),credential(4,31,Credential.Status.PUBLISHED),
            credential(5,-1,Credential.Status.REJECTED),credential(6,1,Credential.Status.SUBMITTED),
            credential(7,-1,Credential.Status.REVOKED));
        when(credentials.findByCaregiverId(1L)).thenReturn(rows);
        var alerts = service.alerts(1L,day);
        assertThat(alerts).extracting(CaregiverWorkDirectory.CredentialAlert::id).containsExactly(1L,2L,3L);
        assertThat(alerts).extracting(CaregiverWorkDirectory.CredentialAlert::warning).containsExactly("EXPIRED","EXPIRING","EXPIRING");
    }
    @Test void warningsSortByExpiryThenIdRegardlessOfSharedRepositoryOrder() {
        var rows = List.of(
            credential(9,10,Credential.Status.PUBLISHED), credential(5,-1,Credential.Status.EXPIRED),
            credential(3,10,Credential.Status.PUBLISHED));
        when(credentials.findByCaregiverId(1L)).thenReturn(rows);
        assertThat(service.alerts(1L,day)).extracting(CaregiverWorkDirectory.CredentialAlert::id)
            .containsExactly(5L,3L,9L);
    }
    @Test void elderProjectionNeverReadsMedicalNotes() {
        var elder = mock(Elder.class);
        when(elder.id()).thenReturn(1L);
        when(elder.fullName()).thenReturn("Mei");
        when(elder.preferredDialects()).thenReturn("English, Mandarin, ");
        when(elders.findById(1L)).thenReturn(Optional.of(elder));
        var result = service.elder(1L);
        assertThat(result.languageNeeds()).containsExactly("English","Mandarin");
        assertThat(result.accessNotes()).isNull();
        assertThat(result.emergencyNotes()).isNull();
        verify(elder,never()).medicalNotes();
    }
    @Test void absentAccountIsDeniedBeforeProfileLookup() {
        assertThatThrownBy(() -> service.require("missing")).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(caregivers);
    }
}

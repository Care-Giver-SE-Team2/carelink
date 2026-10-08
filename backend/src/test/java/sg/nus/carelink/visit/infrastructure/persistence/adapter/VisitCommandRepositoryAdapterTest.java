package sg.nus.carelink.visit.infrastructure.persistence.adapter;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import sg.nus.carelink.shared.error.BusinessRuleViolation;
import sg.nus.carelink.visit.infrastructure.persistence.entity.VisitJpaEntity;
import sg.nus.carelink.visit.infrastructure.persistence.repository.VisitJpaRepository;

class VisitCommandRepositoryAdapterTest {
    private final VisitJpaRepository jpa=mock();
    private final JdbcTemplate jdbc=mock();
    private final EntityManager em=mock();
    private final VisitCommandRepositoryAdapter adapter=new VisitCommandRepositoryAdapter(jpa,jdbc,em);
    @Test void missingRowDoesNotLockAndCachedRowIsRefreshedWithWriteLock() {
        assertThat(adapter.lock(1L)).isEmpty();
        var row=new VisitJpaEntity();row.setId(1L);row.setVersion(0);
        when(em.find(VisitJpaEntity.class,1L)).thenReturn(row);
        doAnswer(_->{row.setVersion(4);return null;}).when(em).refresh(row,LockModeType.PESSIMISTIC_WRITE);
        assertThat(adapter.lock(1L)).get().extracting(v->v.version()).isEqualTo(4);
        verify(jpa,never()).findForCommand(any());
    }
    @Test void failedVersionGuardNeverPretendsToSave() {
        var row=new VisitJpaEntity();row.setId(1L);row.setVersion(7);
        assertThatThrownBy(()->adapter.save(VisitMapper.toDomain(row))).isInstanceOf(BusinessRuleViolation.class);
        verify(jpa,never()).findById(any());
    }
}
